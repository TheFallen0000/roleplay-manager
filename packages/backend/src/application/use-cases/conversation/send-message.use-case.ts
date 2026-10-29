import { v7 as randomUUIDv7 } from "uuid"

import type { MessageDTO } from "@workspace/shared/types/message"
import type { TitleSource } from "@workspace/shared/types/conversation"

import { Message } from "../../../domain/entities/message.entity"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { GenerateConversationTitleUseCase } from "./generate-conversation-title.use-case"
import type { ContextCompactionService } from "../../services/context-compaction.service"
import { ChatEngine } from "../../services/chat-engine.service"
import type {
  CompactingEvent,
  ContextWarningEvent,
  StreamChunkEvent,
  StreamErrorEvent,
  SummaryGeneratedEvent,
  TitleGeneratedEvent,
} from "../../services/chat-events"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { ApplyAllMemoryChangesUseCase } from "../memory/apply-all-memory-changes.use-case"
import type { DecayConversationMemoryUseCase } from "../memory/decay-conversation-memory.use-case"
import { normalizeUserContent } from "../../../lib/reply-format"
import { ConversationNotFoundError } from "../../../domain/errors"
import type { Locale } from "@workspace/shared/i18n"

export type {
  CompactingEvent,
  ContextWarningEvent,
  StreamChunkEvent,
  StreamErrorEvent,
  SummaryGeneratedEvent,
  TitleGeneratedEvent,
} from "../../services/chat-events"

export interface SendMessageInput {
  conversationId: string
  content: string
  /** Language of the system prompt (follows the UI language). */
  locale?: Locale
}

export interface SendMessageEvents {
  type: "user-message-saved"
  message: MessageDTO
}

export interface StreamDoneEvent {
  type: "done"
  message: MessageDTO
  title?: string
  titleSource?: TitleSource
}

export type SendMessageEvent =
  | SendMessageEvents
  | StreamChunkEvent
  | StreamDoneEvent
  | StreamErrorEvent
  | SummaryGeneratedEvent
  | TitleGeneratedEvent
  | CompactingEvent
  | ContextWarningEvent

export class SendMessageUseCase {
  private readonly chatEngine: ChatEngine

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly messageHistoryRepository: MessageHistoryRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryChangeProposalRepository: MemoryChangeProposalRepository,
    private readonly promptContextBuilder: PromptContextBuilder,
    private readonly playerCharacterRepository: PlayerCharacterRepository,
    private readonly providerRegistry: ProviderRegistry,
    private readonly logger: Logger,
    private readonly getDefaultProvider: GetDefaultProviderUseCase,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly applyAllMemoryChanges: ApplyAllMemoryChangesUseCase,
    private readonly summaryRepository: SummaryRepository,
    private readonly contextCompaction: ContextCompactionService,
    private readonly generateConversationTitle: GenerateConversationTitleUseCase,
    private readonly decayMemories: DecayConversationMemoryUseCase,
    chatEngine?: ChatEngine,
  ) {
    this.chatEngine =
      chatEngine ??
      new ChatEngine({
        messageRepository,
        messageHistoryRepository,
        characterRepository,
        memoryRepository,
        memoryChangeProposalRepository,
        summaryRepository,
        playerCharacterRepository,
        promptContextBuilder,
        contextCompaction,
        providerRegistry,
        providerInstanceRepository,
        getDefaultProvider,
        applyAllMemoryChanges,
        generateConversationTitle,
        logger,
      })
  }

  async *execute(input: SendMessageInput): AsyncGenerator<SendMessageEvent> {
    const conversation = await this.conversationRepository.findById(
      input.conversationId,
    )
    if (!conversation) {
      throw new ConversationNotFoundError(input.conversationId)
    }

    const maxPosition = await this.messageHistoryRepository.findMaxPosition(
      input.conversationId,
    )
    const nextPosition = maxPosition + 1

    const lastMsg =
      (
        await this.messageHistoryRepository.findRecentByConversationId(
          input.conversationId,
          1,
        )
      ).at(-1) ?? null
    if (lastMsg?.role === "assistant" && lastMsg.alternatives.length > 0) {
      const accepted = lastMsg.accept()
      await this.messageRepository.update(accepted)
    }

    const userMessage = Message.create({
      id: randomUUIDv7(),
      conversationId: input.conversationId,
      role: "user",
      content: normalizeUserContent(input.content),
      position: nextPosition,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: new Date(),
      editedAt: null,
    })
    await this.messageRepository.create(userMessage)

    yield {
      type: "user-message-saved",
      message: toMessageDTO(userMessage),
    }

    const prepared = yield* this.chatEngine.prepareContext({
      conversation,
      pendingMessages: [userMessage],
      locale: input.locale,
    })
    if (!prepared.ok) {
      yield { type: "error", error: prepared.error }
      return
    }

    const reply = yield* this.chatEngine.streamReply({
      conversation,
      context: prepared.context,
      characterVersion: prepared.characterVersion,
      memories: prepared.memories,
      maxTokens: prepared.outputTokens,
      operation: "send",
    })
    if (!reply.ok) {
      yield { type: "error", error: reply.error }
      return
    }

    const assistantMessage = Message.create({
      id: randomUUIDv7(),
      conversationId: input.conversationId,
      role: "assistant",
      content: reply.content,
      position: nextPosition + 1,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: new Date(),
      editedAt: null,
    })
    await this.messageRepository.create(assistantMessage)

    const ensuredTitle = await this.chatEngine.ensureTitle(conversation)
    await this.chatEngine.applyMemoryProposals(
      conversation,
      reply.proposals,
    )

    yield {
      type: "done",
      message: toMessageDTO(assistantMessage),
      title: ensuredTitle?.title,
      titleSource: ensuredTitle?.titleSource,
    }

    if (conversation.memoryDecayMode === "silent") {
      try {
        await this.decayMemories.execute({
          conversationId: input.conversationId,
        })
      } catch (error) {
        this.logger.error(
          "Failed to run memory decay sweep",
          error as Error,
          { conversationId: input.conversationId },
        )
      }
    }

    if (prepared.compactionSummary && !ensuredTitle) {
      const refreshedTitle = await this.chatEngine.refreshTitle(
        conversation,
        input.locale,
      )
      if (refreshedTitle) {
        yield {
          type: "title-generated",
          title: refreshedTitle.title,
          titleSource: refreshedTitle.titleSource,
        }
      }
    }
  }
}

function toMessageDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    position: m.position,
    alternatives: m.alternatives,
    alternativesCursor: m.alternativesCursor,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
  }
}
