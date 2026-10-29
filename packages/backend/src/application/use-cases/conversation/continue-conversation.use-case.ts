import { v7 as randomUUIDv7 } from "uuid"

import type { MessageDTO } from "@workspace/shared/types/message"

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
import type { GenerateConversationTitleUseCase } from "./generate-conversation-title.use-case"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { ApplyAllMemoryChangesUseCase } from "../memory/apply-all-memory-changes.use-case"
import { ConversationNotFoundError } from "../../../domain/errors"
import { translate, type Locale } from "@workspace/shared/i18n"

export type {
  CompactingEvent,
  ContextWarningEvent,
  StreamChunkEvent,
  StreamErrorEvent,
  SummaryGeneratedEvent,
  TitleGeneratedEvent,
} from "../../services/chat-events"

export interface ContinueConversationInput {
  conversationId: string
  /** Language of the system prompt (follows the UI language). */
  locale?: Locale
}

export interface StreamDoneEvent {
  type: "done"
  message: MessageDTO
}

export type ContinueConversationEvent =
  | StreamChunkEvent
  | StreamDoneEvent
  | StreamErrorEvent
  | SummaryGeneratedEvent
  | TitleGeneratedEvent
  | CompactingEvent
  | ContextWarningEvent

export class ContinueConversationUseCase {
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

  async *execute(
    input: ContinueConversationInput,
  ): AsyncGenerator<ContinueConversationEvent> {
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

    const continuationMessage = Message.create({
      id: randomUUIDv7(),
      conversationId: input.conversationId,
      role: "user",
      content: translate(
        input.locale ?? "en",
        "prompt.continueInstruction",
      ),
      position: nextPosition,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: new Date(),
      editedAt: null,
    })

    const prepared = yield* this.chatEngine.prepareContext({
      conversation,
      pendingMessages: [continuationMessage],
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
      operation: "continue",
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
      position: nextPosition,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: new Date(),
      editedAt: null,
    })
    await this.messageRepository.create(assistantMessage)

    await this.chatEngine.applyMemoryProposals(
      conversation,
      reply.proposals,
    )

    yield { type: "done", message: toMessageDTO(assistantMessage) }

    if (prepared.compactionSummary) {
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
