import { v7 as randomUUIDv7 } from "uuid"

import type { MessageDTO } from "@workspace/shared/types/message"
import type { DefaultProviderConfig, ProviderId } from "@workspace/shared/types/provider"
import type { SummaryDTO } from "@workspace/shared/types/summary"
import type { TitleSource } from "@workspace/shared/types/conversation"

import { Message } from "../../../domain/entities/message.entity"
import { MemoryChangeProposal } from "../../../domain/entities/memory-change-proposal.entity"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { GenerateSummaryUseCase } from "../summary/generate-summary.use-case"
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
import {
  mentionsEmojis,
  normalizeAssistantReply,
} from "../../../lib/reply-format"
import { filterMemoriesForPrompt } from "../../../lib/memory-decay"
import { countMessagesSinceSummary } from "./summary-threshold"
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
    private readonly generateSummary: GenerateSummaryUseCase,
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

    const recentMessages = await this.messageHistoryRepository.findRecentByConversationId(
      input.conversationId,
      Math.max(1, conversation.recentMessageCount),
    )
    const contextMessages = recentMessages.filter(
      (m) => m.id !== input.messageId,
    )

    const memories = await this.memoryRepository.findByConversationId(
      input.conversationId,
    )
    const memoryTurns = (
      await this.messageHistoryRepository.findUserMessageTimes(input.conversationId)
    ).map((createdAt) => ({ role: "user", createdAt }))

    const latestSummary = await this.summaryRepository.findLatestByConversationId(
      input.conversationId,
    )
    const playerCharacter = await resolvePlayerCharacterPrompt(
      this.playerCharacterRepository,
      conversation,
    )

    const context = await this.promptContextBuilder.build({
      characterVersion: characterResult.currentVersion,
      messages: contextMessages,
      recentMessageCount: conversation.recentMessageCount,
      memories: filterMemoriesForPrompt(conversation, memories, memoryTurns),
      summary: latestSummary ?? undefined,
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

    yield { type: "done", message: toMessageDTO(regenerated) }

    // Save and auto-apply extracted proposals
    if (proposals.length > 0) {
      try {
        const now = new Date()
        const proposalEntities = proposals.map((proposal) =>
          MemoryChangeProposal.create({
            id: randomUUIDv7(),
            conversationId: input.conversationId,
            operation: proposal.operation,
            targetMemoryId: proposal.targetMemoryId,
            actor: proposal.actor,
            title: proposal.title,
            description: proposal.description,
            priority: proposal.priority,
            status: "pending",
            createdAt: now,
            processedAt: null,
            processedBy: "user",
          }),
        )
        await this.memoryChangeProposalRepository.createMany(proposalEntities)
      } catch (error) {
        this.logger.error("Failed to save memory proposals", error as Error, {
          conversationId: input.conversationId,
        })
      }
    }

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

    // Trigger summary generation if threshold is reached
    try {
      const messagesSinceLast = await countMessagesSinceSummary(
        input.conversationId,
        latestSummary?.lastMessageId ?? null,
        this.messageHistoryRepository,
      )
      if (messagesSinceLast >= conversation.summaryFrequency) {
        const summaryResult = await this.generateSummary.execute(
          input.conversationId,
          { locale: input.locale },
        )
        if (summaryResult.summary) {
          yield { type: "summary-generated", summary: summaryResult.summary }
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
    } catch (error) {
      this.logger.error(
        "Failed to generate summary",
        error as Error,
        { conversationId: input.conversationId },
      )
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
