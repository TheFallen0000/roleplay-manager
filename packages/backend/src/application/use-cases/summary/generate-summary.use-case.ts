import { v7 as randomUUIDv7 } from "uuid"

import type { SummaryDTO } from "@workspace/shared/types/summary"
import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
  type TranslationParams,
} from "@workspace/shared/i18n"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { ProviderRegistry, ProviderPort } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { DefaultProviderConfig, ProviderId } from "@workspace/shared/types/provider"
import { Summary } from "../../../domain/entities/summary.entity"
import type { PromptContext, PromptContextMessage } from "../../../domain/value-objects/prompt-context"
import type { Memory } from "../../../domain/entities/memory.entity"
import type { Message } from "../../../domain/entities/message.entity"
import { filterMemoriesForPrompt } from "../../../lib/memory-decay"

interface GenerateSummaryResult {
  summary: SummaryDTO
  error?: never
}

interface GenerateSummaryError {
  summary?: never
  error: { code: string; message: string }
}

type GenerateSummaryOutput = GenerateSummaryResult | GenerateSummaryError

export class GenerateSummaryUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly messageHistoryRepository: MessageHistoryRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly providerRegistry: ProviderRegistry,
    private readonly getDefaultProvider: GetDefaultProviderUseCase,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    conversationId: string,
    options: { locale?: Locale } = {},
  ): Promise<GenerateSummaryOutput> {
    const locale = options.locale ?? DEFAULT_LOCALE
    const conversation = await this.conversationRepository.findById(conversationId)
    if (!conversation) {
      return { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } }
    }

    const latestSummary = await this.summaryRepository.findLatestByConversationId(conversationId)

    let newMessages: Message[]
    if (!latestSummary) {
      newMessages = await this.messageRepository.findByConversationId(conversationId)
      if (newMessages.length === 0) {
        return { error: { code: "NO_MESSAGES", message: "No messages to summarize" } }
      }
    } else {
      const lastPosition = await this.messageHistoryRepository.findPositionById(
        latestSummary.lastMessageId,
      )
      if (lastPosition === null) {
        newMessages = await this.messageRepository.findByConversationId(conversationId)
        if (newMessages.length === 0) {
          return { error: { code: "NO_MESSAGES", message: "No messages to summarize" } }
        }
      } else {
        newMessages = await this.messageHistoryRepository.findAfterPosition(
          conversationId,
          lastPosition,
        )
        if (newMessages.length === 0) {
          return { error: { code: "NO_NEW_MESSAGES", message: "No new messages since last summary" } }
        }
      }
    }

    const version = await this.characterRepository.findVersionById(conversation.versionId)
    if (!version) {
      return { error: { code: "CHARACTER_VERSION_NOT_FOUND", message: `Version '${conversation.versionId}' not found` } }
    }

    const characterResult = await this.characterRepository.findById(version.characterId)
    if (!characterResult) {
      return { error: { code: "CHARACTER_NOT_FOUND", message: `Character '${version.characterId}' not found` } }
    }

    const previousSummaryContent = latestSummary?.content

    const memories = await this.memoryRepository.findByConversationId(conversationId)
    const memoryTurns = (
      await this.messageHistoryRepository.findUserMessageTimes(conversationId)
    ).map((createdAt) => ({ role: "user", createdAt }))

    const context = await this.buildSummaryContext({
      newMessages,
      previousSummaryContent,
      memories: filterMemoriesForPrompt(conversation, memories, memoryTurns),
      characterName: characterResult.currentVersion.name,
      locale,
    })

    let providerId = conversation.provider as ProviderId | null
    let providerInstanceId = conversation.providerInstanceId
    let resolvedModel = conversation.model
    if (!providerId) {
      const defaultConfig: DefaultProviderConfig = await this.getDefaultProvider.execute()
      providerId = defaultConfig.provider
      providerInstanceId = defaultConfig.providerInstanceId
      resolvedModel ??= defaultConfig.models[providerId as ProviderId] ?? null
    }
    if (!providerId) {
      return { error: { code: "PROVIDER_NOT_CONFIGURED", message: "No provider configured" } }
    }

    let adapter: ProviderPort | null = null
    if (providerInstanceId) {
      const instance = await this.providerInstanceRepository.findById(providerInstanceId)
      if (instance) {
        adapter = this.providerRegistry.createAdapter(instance)
      }
    }
    if (!adapter) {
      adapter = await this.providerRegistry.getAdapter(providerId)
    }
    if (!adapter) {
      return { error: { code: "PROVIDER_NOT_CONFIGURED", message: `Provider '${providerId}' is not configured` } }
    }

    const model = resolvedModel ?? undefined

    let fullContent = ""
    try {
      for await (const chunk of adapter.generateStreaming(context, {
        model,
        temperature: conversation.temperature,
        maxTokens: conversation.maxTokens,
        topP: conversation.topP,
        frequencyPenalty: conversation.frequencyPenalty,
        presencePenalty: conversation.presencePenalty,
        stopSequences: conversation.stopSequences,
      })) {
        fullContent += chunk.content
      }
    } catch (error) {
      this.logger.error("Summary generation streaming failed", error as Error, { conversationId })
      return { error: { code: "STREAMING_FAILED", message: (error as Error).message } }
    }

    const trimmed = fullContent.trim()
    if (!trimmed) {
      return { error: { code: "EMPTY_SUMMARY", message: "Generated summary is empty" } }
    }

    const firstMessageId = newMessages[0].id
    const lastMessageId = newMessages[newMessages.length - 1].id

    const summary = Summary.create({
      id: randomUUIDv7(),
      conversationId,
      content: trimmed,
      firstMessageId,
      lastMessageId,
      model: model ?? null,
      provider: providerId,
      createdAt: new Date(),
      editedAt: null,
    })

    await this.summaryRepository.create(summary)

    return { summary: toSummaryDTO(summary) }
  }

  private async buildSummaryContext(params: {
    newMessages: Message[]
    previousSummaryContent: string | undefined
    memories: Memory[]
    characterName: string
    locale: Locale
  }): Promise<PromptContext> {
    const {
      newMessages,
      previousSummaryContent,
      memories,
      characterName,
      locale,
    } = params
    const tr = (key: string, values?: TranslationParams) =>
      translate(locale, key, values)

    const systemParts: string[] = [
      tr("summaryPrompt.system"),
      "",
      tr("summaryPrompt.instructions"),
      tr("summaryPrompt.events"),
      tr("summaryPrompt.tone"),
      tr("summaryPrompt.integrate"),
      tr("summaryPrompt.length"),
      tr("summaryPrompt.noMeta"),
      tr("summaryPrompt.language"),
    ]

    if (memories.length > 0) {
      systemParts.push("")
      systemParts.push(tr("summaryPrompt.memory"))
      systemParts.push(tr("summaryPrompt.memoryHint"))
      for (const mem of memories) {
        systemParts.push(
          tr("summaryPrompt.memoryLine", {
            id: mem.id,
            actor: mem.actor,
            title: mem.title,
            description: mem.description,
            priority: mem.priority,
          }),
        )
      }
    }

    const contextMessages: PromptContextMessage[] = []

    if (previousSummaryContent) {
      contextMessages.push({
        role: "user",
        content: tr("summaryPrompt.previousRequest"),
      })
      contextMessages.push({
        role: "assistant",
        content: previousSummaryContent,
      })
    }

    const transcript = newMessages
      .map((m) => {
        const role =
          m.role === "user"
            ? tr("summaryPrompt.userLabel")
            : tr("summaryPrompt.assistantLabel", { name: characterName })
        return `[${role}]: ${m.content}`
      })
      .join("\n\n")

    const firstId = newMessages[0].id
    const lastId = newMessages[newMessages.length - 1].id

    contextMessages.push({
      role: "user",
      content: [
        tr("summaryPrompt.transcriptIntro", { firstId, lastId }),
        tr("summaryPrompt.noRoleplay", { name: characterName }),
        tr("summaryPrompt.onlyTask"),
        "",
        "---",
        "",
        transcript,
        "",
        "---",
        "",
        tr("summaryPrompt.final"),
      ].join("\n"),
    })

    return {
      systemPrompt: systemParts.join("\n"),
      messages: contextMessages,
    }
  }
}

function toSummaryDTO(s: Summary): SummaryDTO {
  return {
    id: s.id,
    conversationId: s.conversationId,
    content: s.content,
    firstMessageId: s.firstMessageId,
    lastMessageId: s.lastMessageId,
    model: s.model,
    provider: s.provider,
    createdAt: s.createdAt.toISOString(),
    editedAt: s.editedAt?.toISOString() ?? null,
  }
}
