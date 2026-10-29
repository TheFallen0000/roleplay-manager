import type { MessageDTO } from "@workspace/shared/types/message"

import type { Message } from "../../../domain/entities/message.entity"
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
import {
  ConversationNotFoundError,
  MessageNotFoundError,
} from "../../../domain/errors"
import type { Locale } from "@workspace/shared/i18n"

export type {
  CompactingEvent,
  ContextWarningEvent,
  StreamChunkEvent,
  StreamErrorEvent,
  SummaryGeneratedEvent,
  TitleGeneratedEvent,
} from "../../services/chat-events"

export interface RegenerateReplyInput {
  conversationId: string
  messageId: string
  /** Language of the system prompt (follows the UI language). */
  locale?: Locale
}

export interface StreamDoneEvent {
  type: "done"
  message: MessageDTO
}

export type RegenerateReplyEvent =
  | StreamChunkEvent
  | StreamDoneEvent
  | StreamErrorEvent
  | SummaryGeneratedEvent
  | TitleGeneratedEvent
  | CompactingEvent
  | ContextWarningEvent

export class RegenerateReplyUseCase {
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
    input: RegenerateReplyInput,
  ): AsyncGenerator<RegenerateReplyEvent> {
    const conversation = await this.conversationRepository.findById(
      input.conversationId,
    )
    if (!conversation) {
      throw new ConversationNotFoundError(input.conversationId)
    }

    const message = await this.messageRepository.findById(input.messageId)
    if (!message) {
      throw new MessageNotFoundError(input.messageId)
    }
    if (message.role !== "assistant") {
      yield {
        type: "error",
        error: {
          code: "NOT_ASSISTANT_MESSAGE",
          message: "Only assistant messages can be regenerated.",
        },
      }
      return
    }

    const prepared = yield* this.chatEngine.prepareContext({
      conversation,
      excludeMessageId: input.messageId,
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
      operation: "regenerate",
    })
    if (!reply.ok) {
      yield { type: "error", error: reply.error }
      return
    }

    const regenerated = message.regenerate(reply.content)
    await this.messageRepository.update(regenerated)

    await this.chatEngine.applyMemoryProposals(
      conversation,
      reply.proposals,
    )

    yield { type: "done", message: toMessageDTO(regenerated) }

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
