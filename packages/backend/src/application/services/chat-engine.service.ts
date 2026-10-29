import type { Locale } from "@workspace/shared/i18n"
import type { TitleSource } from "@workspace/shared/types/conversation"
import type { SummaryDTO } from "@workspace/shared/types/summary"
import type { DefaultProviderConfig, ProviderId } from "@workspace/shared/types/provider"

import type { CharacterVersion } from "../../domain/entities/character-version.entity"
import type { Conversation } from "../../domain/entities/conversation.entity"
import type { Memory } from "../../domain/entities/memory.entity"
import type { Message } from "../../domain/entities/message.entity"
import type { CharacterRepository } from "../../domain/ports/character.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../../domain/ports/message.repository"
import type { MemoryRepository } from "../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../domain/ports/memory-change-proposal.repository"
import type { SummaryRepository } from "../../domain/ports/summary.repository"
import type { PromptContextBuilder } from "../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../domain/ports/player-character.repository"
import type { Logger } from "../../domain/ports/logger.port"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../domain/ports/provider-instance.repository"
import type { PromptContext } from "../../domain/value-objects/prompt-context"
import type { GetDefaultProviderUseCase } from "../use-cases/provider/get-default-provider.use-case"
import type { ApplyAllMemoryChangesUseCase } from "../use-cases/memory/apply-all-memory-changes.use-case"
import type { GenerateConversationTitleUseCase } from "../use-cases/conversation/generate-conversation-title.use-case"
import type { ContextCompactionService } from "./context-compaction.service"
import type { NormalizedProposal } from "../../lib/normalize-proposals"

import { loadMessagesAfterSummary } from "../use-cases/conversation/load-messages-after-summary"
import { resolvePlayerCharacterPrompt } from "../use-cases/conversation/resolve-player-character"
import { filterMemoriesForPrompt } from "../../lib/memory-decay"
import { createCleanStream, extractProposals, type CleanStreamState } from "../../lib/memory-proposal-extractor"
import { normalizeProposals } from "../../lib/normalize-proposals"
import { saveMemoryProposals } from "../../lib/save-memory-proposals"
import {
  mentionsEmojis,
  normalizeAssistantReply,
} from "../../lib/reply-format"
import { propagateToolCalls, type ToolCallState } from "../../lib/propagate-tool-calls"
import {
  accumulateToolCallDeltas,
  buildProposeMemoryChangesTool,
  toolCallsToRawProposals,
} from "../../lib/propose-memory-changes.tool"
import type {
  ChatContextEvent,
  StreamChunkEvent,
} from "./chat-events"

export interface ChatEngineDeps {
  messageRepository: MessageRepository
  messageHistoryRepository: MessageHistoryRepository
  characterRepository: CharacterRepository
  memoryRepository: MemoryRepository
  memoryChangeProposalRepository: MemoryChangeProposalRepository
  summaryRepository: SummaryRepository
  playerCharacterRepository: PlayerCharacterRepository
  promptContextBuilder: PromptContextBuilder
  contextCompaction: ContextCompactionService
  providerRegistry: ProviderRegistry
  providerInstanceRepository: ProviderInstanceRepository
  getDefaultProvider: GetDefaultProviderUseCase
  applyAllMemoryChanges: ApplyAllMemoryChangesUseCase
  generateConversationTitle: GenerateConversationTitleUseCase
  logger: Logger
}

export interface PrepareChatContextInput {
  conversation: Conversation
  /** Extra messages not yet guaranteed to be visible through the repository. */
  pendingMessages?: Message[]
  /** Used by regenerate: the assistant message being replaced is not context. */
  excludeMessageId?: string
  locale?: Locale
}

export interface PreparedChatContext {
  ok: true
  context: PromptContext
  characterVersion: CharacterVersion
  /** Unfiltered memories, needed to hydrate UPDATE/DELETE proposals. */
  memories: Memory[]
  compactionSummary: SummaryDTO | null
}

export interface ChatEngineFailure {
  ok: false
  error: { code: string; message: string }
}

export type PrepareChatContextResult = PreparedChatContext | ChatEngineFailure

export interface StreamChatReplyInput {
  conversation: Conversation
  context: PromptContext
  characterVersion: CharacterVersion
  memories: Memory[]
  operation: "send" | "continue" | "regenerate"
}

export interface ChatReply {
  ok: true
  content: string
  proposals: NormalizedProposal[]
}

export type StreamChatReplyResult = ChatReply | ChatEngineFailure

const OPERATION_LABEL: Record<StreamChatReplyInput["operation"], string> = {
  send: "Send",
  continue: "Continue",
  regenerate: "Regenerate",
}

/**
 * Shared orchestration for the three reply flows.
 *
 * It owns prompt assembly, context compaction, provider resolution, the
 * streaming/tool loop and proposal extraction. The use cases keep the parts
 * that differ: creating the user message, creating or updating the assistant
 * message, memory decay and SSE bookkeeping.
 */
export class ChatEngine {
  constructor(private readonly deps: ChatEngineDeps) {}

  async *prepareContext(
    input: PrepareChatContextInput,
  ): AsyncGenerator<ChatContextEvent, PrepareChatContextResult> {
    const { conversation, locale } = input
    const latestSummary =
      await this.deps.summaryRepository.findLatestByConversationId(
        conversation.id,
      )
    const messagesAfterSummary = await loadMessagesAfterSummary({
      conversationId: conversation.id,
      summary: latestSummary,
      messageHistoryRepository: this.deps.messageHistoryRepository,
      messageRepository: this.deps.messageRepository,
    })
    const loadedIds = new Set(messagesAfterSummary.map((message) => message.id))
    const pendingMessages = (input.pendingMessages ?? []).filter(
      (message) => !loadedIds.has(message.id),
    )
    const candidateMessages = [...messagesAfterSummary, ...pendingMessages]
    const contextMessages = input.excludeMessageId
      ? candidateMessages.filter(
          (message) => message.id !== input.excludeMessageId,
        )
      : candidateMessages

    const version = await this.deps.characterRepository.findVersionById(
      conversation.versionId,
    )
    if (!version) {
      return this.failure(
        "CHARACTER_VERSION_NOT_FOUND",
        `Character version '${conversation.versionId}' not found.`,
      )
    }

    const characterResult = await this.deps.characterRepository.findById(
      version.characterId,
    )
    if (!characterResult) {
      return this.failure(
        "CHARACTER_NOT_FOUND",
        `Character '${version.characterId}' not found.`,
      )
    }

    const memories = await this.deps.memoryRepository.findByConversationId(
      conversation.id,
    )
    const memoryTurns = (
      await this.deps.messageHistoryRepository.findUserMessageTimes(
        conversation.id,
      )
    ).map((createdAt) => ({ role: "user", createdAt }))
    const promptMemories = filterMemoriesForPrompt(
      conversation,
      memories,
      memoryTurns,
    )
    const playerCharacter = await resolvePlayerCharacterPrompt(
      this.deps.playerCharacterRepository,
      conversation,
    )

    let promptMessages = contextMessages
    let contextSummary = latestSummary
    let compactionSummary: SummaryDTO | null = null
    const compactionInput = {
      conversation,
      characterVersion: characterResult.currentVersion,
      messages: contextMessages,
      memories: promptMemories,
      playerCharacter,
      latestSummary,
      locale,
    }

    if (await this.deps.contextCompaction.needsCompaction(compactionInput)) {
      yield { type: "compacting" }
      const compaction = await this.deps.contextCompaction.compact(
        compactionInput,
      )
      if (!compaction.ok) {
        return this.failure(compaction.error.code, compaction.error.message)
      }
      if (compaction.warning) {
        yield { type: "context-warning", warning: compaction.warning }
      }
      if (compaction.summaryGenerated) {
        compactionSummary = compaction.summaryGenerated
        yield {
          type: "summary-generated",
          summary: compaction.summaryGenerated,
        }
      }
      promptMessages = compaction.messages
      contextSummary = compaction.summary
    }

    const context = await this.deps.promptContextBuilder.build({
      characterVersion: characterResult.currentVersion,
      messages: promptMessages,
      recentMessageCount: promptMessages.length,
      memories: promptMemories,
      summary: contextSummary ?? undefined,
      playerCharacter,
      locale,
      enableMemoryProposalTool: true,
      filterOocFromHistory: true,
    })

    return {
      ok: true,
      context,
      characterVersion: characterResult.currentVersion,
      memories,
      compactionSummary,
    }
  }

  async *streamReply(
    input: StreamChatReplyInput,
  ): AsyncGenerator<StreamChunkEvent, StreamChatReplyResult> {
    const { conversation, context, characterVersion, memories } = input
    const provider = await this.resolveProvider(conversation)
    if (!provider.ok) return provider

    const cleanState: CleanStreamState = { fullContent: "" }
    const toolCallState: ToolCallState = { deltas: [] }
    const tools = [buildProposeMemoryChangesTool()]

    try {
      for await (const chunk of createCleanStream(
        propagateToolCalls(
          provider.adapter.generateStreaming(context, {
            model: provider.model,
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
      this.deps.logger.error(
        `${OPERATION_LABEL[input.operation]} streaming failed`,
        error as Error,
        { conversationId: conversation.id },
      )
      return this.failure(
        "STREAMING_FAILED",
        (error as Error).message,
      )
    }

    const fallback = extractProposals(cleanState.fullContent)
    const toolProposals =
      toolCallState.deltas.length > 0
        ? toolCallsToRawProposals(accumulateToolCallDeltas(toolCallState.deltas))
        : []
    const { proposals, dropped } = normalizeProposals(
      toolProposals.length > 0 ? toolProposals : fallback.proposals,
      memories,
    )

    if (fallback.foundBlock && fallback.proposals.length === 0) {
      // The block was stripped but nothing could be read: keep a sample so a
      // model drifting on the format can be diagnosed.
      this.deps.logger.warn("Memory proposal block could not be parsed", {
        conversationId: conversation.id,
        sample: cleanState.fullContent.slice(0, 500),
      })
    }
    if (dropped > 0) {
      this.deps.logger.warn("Dropped invalid memory proposals", {
        conversationId: conversation.id,
        dropped,
      })
    }

    const content = normalizeAssistantReply(fallback.cleanedContent, {
      allowEmojis: mentionsEmojis(characterVersion.instructions),
    })

    if (!content) {
      await saveMemoryProposals(
        this.deps.memoryChangeProposalRepository,
        conversation.id,
        proposals,
        this.deps.logger,
      )
      if (proposals.length > 0) {
        this.deps.logger.warn("Empty response with memory proposals", {
          conversationId: conversation.id,
          count: proposals.length,
        })
      }
      return this.failure(
        "EMPTY_RESPONSE",
        "The provider returned an empty response.",
      )
    }

    return { ok: true, content, proposals }
  }

  async applyMemoryProposals(
    conversation: Conversation,
    proposals: readonly NormalizedProposal[],
  ): Promise<void> {
    await saveMemoryProposals(
      this.deps.memoryChangeProposalRepository,
      conversation.id,
      proposals,
      this.deps.logger,
    )

    if (conversation.memoryProposalMode === "auto" && proposals.length > 0) {
      try {
        await this.deps.applyAllMemoryChanges.execute({
          conversationId: conversation.id,
          processedBy: "system",
        })
      } catch (error) {
        this.deps.logger.error(
          "Failed to auto-apply memory proposals",
          error as Error,
          { conversationId: conversation.id },
        )
      }
    }
  }

  /** Generates the first title only when the conversation still has none. */
  async ensureTitle(
    conversation: Conversation,
  ): Promise<{ title: string; titleSource: TitleSource } | null> {
    if (conversation.title !== null) return null
    try {
      return await this.deps.generateConversationTitle.execute(conversation.id)
    } catch (error) {
      this.deps.logger.error(
        "Failed to generate conversation title",
        error as Error,
        { conversationId: conversation.id },
      )
      return null
    }
  }

  /** Refreshes an existing automatic title; manual titles are respected. */
  async refreshTitle(
    conversation: Conversation,
    locale?: Locale,
  ): Promise<{ title: string; titleSource: TitleSource } | null> {
    try {
      const result = await this.deps.generateConversationTitle.execute(
        conversation.id,
        { locale },
      )
      return result.title !== conversation.title ? result : null
    } catch (error) {
      this.deps.logger.error(
        "Failed to regenerate conversation title",
        error as Error,
        { conversationId: conversation.id },
      )
      return null
    }
  }

  private async resolveProvider(
    conversation: Conversation,
  ): Promise<
    | { ok: true; adapter: ProviderPort; model: string | undefined }
    | ChatEngineFailure
  > {
    let providerId = conversation.provider as ProviderId | null
    let providerInstanceId = conversation.providerInstanceId
    let resolvedModel = conversation.model

    if (!providerId) {
      const defaultConfig: DefaultProviderConfig =
        await this.deps.getDefaultProvider.execute()
      providerId = defaultConfig.provider
      providerInstanceId = defaultConfig.providerInstanceId
      resolvedModel ??=
        defaultConfig.models[providerId as ProviderId] ?? null
    }
    if (!providerId) {
      return this.failure(
        "PROVIDER_NOT_CONFIGURED",
        "No se ha configurado un proveedor por defecto.",
      )
    }

    let adapter: ProviderPort | null = null
    if (providerInstanceId) {
      const instance = await this.deps.providerInstanceRepository.findById(
        providerInstanceId,
      )
      if (instance) {
        adapter = this.deps.providerRegistry.createAdapter(instance)
      }
    }
    if (!adapter) {
      adapter = await this.deps.providerRegistry.getAdapter(providerId)
    }
    if (!adapter) {
      return this.failure(
        "PROVIDER_NOT_CONFIGURED",
        `Provider '${providerId}' is not configured.`,
      )
    }

    return {
      ok: true,
      adapter,
      model: resolvedModel ?? undefined,
    }
  }

  private failure(code: string, message: string): ChatEngineFailure {
    return { ok: false, error: { code, message } }
  }
}
