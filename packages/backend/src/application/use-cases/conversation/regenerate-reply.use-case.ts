import type { MessageDTO } from "@workspace/shared/types/message"
import type { DefaultProviderConfig, ProviderId } from "@workspace/shared/types/provider"
import type { SummaryDTO } from "@workspace/shared/types/summary"
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
import type { ContextCompactionService } from "../../services/context-compaction.service"
import type { GenerateConversationTitleUseCase } from "./generate-conversation-title.use-case"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { resolvePlayerCharacterPrompt } from "./resolve-player-character"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { ApplyAllMemoryChangesUseCase } from "../memory/apply-all-memory-changes.use-case"
import { extractProposals, createCleanStream, type CleanStreamState } from "../../../lib/memory-proposal-extractor"
import { normalizeProposals } from "../../../lib/normalize-proposals"
import { saveMemoryProposals } from "../../../lib/save-memory-proposals"
import {
  mentionsEmojis,
  normalizeAssistantReply,
} from "../../../lib/reply-format"
import { filterMemoriesForPrompt } from "../../../lib/memory-decay"
import { loadMessagesAfterSummary } from "./load-messages-after-summary"
import { propagateToolCalls, type ToolCallState } from "../../../lib/propagate-tool-calls"
import {
  accumulateToolCallDeltas,
  buildProposeMemoryChangesTool,
  toolCallsToRawProposals,
} from "../../../lib/propose-memory-changes.tool"
import {
  ConversationNotFoundError,
  MessageNotFoundError,
} from "../../../domain/errors"
import type { Locale } from "@workspace/shared/i18n"

export interface RegenerateReplyInput {
  conversationId: string
  messageId: string
  /** Language of the system prompt (follows the UI language). */
  locale?: Locale
}

export interface StreamChunkEvent {
  type: "chunk"
  content: string
}

export interface StreamDoneEvent {
  type: "done"
  message: MessageDTO
}

export interface StreamErrorEvent {
  type: "error"
  error: { code: string; message: string }
}

export interface SummaryGeneratedEvent {
  type: "summary-generated"
  summary: SummaryDTO
}

export interface CompactingEvent {
  type: "compacting"
}

export interface ContextWarningEvent {
  type: "context-warning"
  warning: { code: string; message: string }
}

export interface TitleGeneratedEvent {
  type: "title-generated"
  title: string
  titleSource: TitleSource
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
  ) {}

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

    const version = await this.characterRepository.findVersionById(
      conversation.versionId,
    )
    if (!version) {
      yield {
        type: "error",
        error: {
          code: "CHARACTER_VERSION_NOT_FOUND",
          message: `Character version '${conversation.versionId}' not found.`,
        },
      }
      return
    }

    const characterResult = await this.characterRepository.findById(
      version.characterId,
    )
    if (!characterResult) {
      yield {
        type: "error",
        error: {
          code: "CHARACTER_NOT_FOUND",
          message: `Character '${version.characterId}' not found.`,
        },
      }
      return
    }

    const latestSummary = await this.summaryRepository.findLatestByConversationId(
      input.conversationId,
    )
    const messagesAfterSummary = await loadMessagesAfterSummary({
      conversationId: input.conversationId,
      summary: latestSummary,
      messageHistoryRepository: this.messageHistoryRepository,
      messageRepository: this.messageRepository,
    })
    const contextMessages = messagesAfterSummary.filter(
      (m) => m.id !== input.messageId,
    )

    const memories = await this.memoryRepository.findByConversationId(
      input.conversationId,
    )
    const memoryTurns = (
      await this.messageHistoryRepository.findUserMessageTimes(input.conversationId)
    ).map((createdAt) => ({ role: "user", createdAt }))

    const playerCharacter = await resolvePlayerCharacterPrompt(
      this.playerCharacterRepository,
      conversation,
    )
    const promptMemories = filterMemoriesForPrompt(
      conversation,
      memories,
      memoryTurns,
    )

    let contextMessagesForPrompt = contextMessages
    let contextSummary = latestSummary
    let compactedSummary: SummaryDTO | undefined
    const compactionInput = {
      conversation,
      characterVersion: characterResult.currentVersion,
      messages: contextMessages,
      memories: promptMemories,
      playerCharacter,
      latestSummary,
      locale: input.locale,
    }
    if (await this.contextCompaction.needsCompaction(compactionInput)) {
      yield { type: "compacting" }
      const compaction = await this.contextCompaction.compact(compactionInput)
      if (!compaction.ok) {
        yield { type: "error", error: compaction.error }
        return
      }
      if (compaction.warning) {
        yield { type: "context-warning", warning: compaction.warning }
      }
      if (compaction.summaryGenerated) {
        compactedSummary = compaction.summaryGenerated
        yield { type: "summary-generated", summary: compaction.summaryGenerated }
      }
      contextMessagesForPrompt = compaction.messages
      contextSummary = compaction.summary
    }

    const context = await this.promptContextBuilder.build({
      characterVersion: characterResult.currentVersion,
      messages: contextMessagesForPrompt,
      recentMessageCount: contextMessagesForPrompt.length,
      memories: promptMemories,
      summary: contextSummary ?? undefined,
      playerCharacter,
      locale: input.locale,
      enableMemoryProposalTool: true,
      filterOocFromHistory: true,
    })

    let providerId = conversation.provider as ProviderId | null
    let providerInstanceId = conversation.providerInstanceId
    let resolvedModel = conversation.model
    if (!providerId) {
      const defaultConfig: DefaultProviderConfig =
        await this.getDefaultProvider.execute()
      providerId = defaultConfig.provider
      providerInstanceId = defaultConfig.providerInstanceId
      resolvedModel ??= defaultConfig.models[providerId as ProviderId] ?? null
    }
    if (!providerId) {
      yield {
        type: "error",
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message: "No se ha configurado un proveedor por defecto.",
        },
      }
      return
    }

    let adapter = null
    if (providerInstanceId) {
      const instance = await this.providerInstanceRepository.findById(
        providerInstanceId,
      )
      if (instance) {
        adapter = this.providerRegistry.createAdapter(instance)
      }
    }
    if (!adapter) {
      adapter = await this.providerRegistry.getAdapter(providerId)
    }
    if (!adapter) {
      yield {
        type: "error",
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message: `Provider '${providerId}' is not configured.`,
        },
      }
      return
    }

    const model = resolvedModel ?? undefined
    const cleanState: CleanStreamState = { fullContent: "" }
    const toolCallState: ToolCallState = { deltas: [] }
    const tools = [buildProposeMemoryChangesTool()]

    try {
      for await (const chunk of createCleanStream(
        propagateToolCalls(
          adapter.generateStreaming(context, {
            model,
            temperature: conversation.temperature,
            maxTokens: conversation.maxTokens,
            topP: conversation.topP,
            frequencyPenalty: conversation.frequencyPenalty,
            presencePenalty: conversation.presencePenalty,
            stopSequences: conversation.stopSequences,
            tools,
          }),
          toolCallState,
        ),
        cleanState,
      )) {
        yield { type: "chunk", content: chunk.content }
      }
    } catch (error) {
      this.logger.error("Regenerate streaming failed", error as Error, {
        conversationId: input.conversationId,
        messageId: input.messageId,
      })
      yield {
        type: "error",
        error: {
          code: "STREAMING_FAILED",
          message: (error as Error).message,
        },
      }
      return
    }

    const fallback = extractProposals(cleanState.fullContent)
    const cleanedContent = fallback.cleanedContent
    const toolProposals =
      toolCallState.deltas.length > 0
        ? toolCallsToRawProposals(accumulateToolCallDeltas(toolCallState.deltas))
        : []
    const { proposals, dropped } = normalizeProposals(
      toolProposals.length > 0 ? toolProposals : fallback.proposals,
      memories,
    )
    if (dropped > 0) {
      this.logger.warn("Dropped invalid memory proposals", {
        conversationId: input.conversationId,
        dropped,
      })
    }

    const normalizedContent = normalizeAssistantReply(cleanedContent, {
      allowEmojis: mentionsEmojis(characterResult.currentVersion.instructions),
    })

    if (!normalizedContent) {
      await saveMemoryProposals(
        this.memoryChangeProposalRepository,
        input.conversationId,
        proposals,
        this.logger,
      )
      if (proposals.length > 0) {
        this.logger.warn("Empty response with memory proposals", {
          conversationId: input.conversationId,
          count: proposals.length,
        })
      }
      yield {
        type: "error",
        error: {
          code: "EMPTY_RESPONSE",
          message: "The provider returned an empty response.",
        },
      }
      return
    }

    const regenerated = message.regenerate(normalizedContent)
    await this.messageRepository.update(regenerated)

    await saveMemoryProposals(
      this.memoryChangeProposalRepository,
      input.conversationId,
      proposals,
      this.logger,
    )

    if (conversation.memoryProposalMode === "auto" && proposals.length > 0) {
      try {
        await this.applyAllMemoryChanges.execute({
          conversationId: input.conversationId,
          processedBy: "system",
        })
      } catch (error) {
        this.logger.error(
          "Failed to auto-apply memory proposals",
          error as Error,
          { conversationId: input.conversationId },
        )
      }
    }

    yield { type: "done", message: toMessageDTO(regenerated) }

    if (compactedSummary) {
      try {
        const titleResult = await this.generateConversationTitle.execute(
          input.conversationId,
          { locale: input.locale },
        )
        if (titleResult.title !== conversation.title) {
          yield {
            type: "title-generated",
            title: titleResult.title,
            titleSource: "auto",
          }
        }
      } catch (titleError) {
        this.logger.error(
          "Failed to regenerate conversation title",
          titleError as Error,
          { conversationId: input.conversationId },
        )
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
