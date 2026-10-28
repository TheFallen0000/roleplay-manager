import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { ProviderId, ProviderRegistry } from "../../../domain/ports/provider.port"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import {
  ConversationNotFoundError,
} from "../../../domain/errors"
import type { PromptContext } from "../../../domain/value-objects/prompt-context"
import type { TitleSource } from "@workspace/shared/types/conversation"
import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
  type TranslationParams,
} from "@workspace/shared/i18n"

export interface GenerateConversationTitleOptions {
  /** Explicit user action: allow replacing a manual title. */
  force?: boolean
  /** UI language, used only when the conversation is too short to infer one. */
  locale?: Locale
}

const TITLE_CONTEXT_MESSAGES = 20

export class GenerateConversationTitleUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageHistoryRepository: MessageHistoryRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly providerRegistry: ProviderRegistry,
    private readonly getDefaultProvider: GetDefaultProviderUseCase,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    conversationId: string,
    options: GenerateConversationTitleOptions = {},
  ): Promise<{ title: string; titleSource: TitleSource }> {
    const conv = await this.conversationRepository.findById(conversationId)
    if (!conv) {
      throw new ConversationNotFoundError(conversationId)
    }

    if (!options.force && conv.titleSource === "manual" && conv.title) {
      return { title: conv.title, titleSource: "manual" }
    }

    const version = await this.characterRepository.findVersionById(conv.versionId)
    if (!version) {
      throw new Error(`Character version '${conv.versionId}' not found.`)
    }

    // Titles describe the current arc; sending the whole transcript becomes
    // very expensive after a few summaries.
    const messages = await this.messageHistoryRepository.findRecentByConversationId(
      conversationId,
      TITLE_CONTEXT_MESSAGES,
    )
    if (messages.length === 0) {
      throw new Error("Cannot generate title: conversation has no messages.")
    }
    const latestSummary = await this.summaryRepository.findLatestByConversationId(
      conversationId,
    )

    let providerId = conv.provider
    let providerInstanceId = conv.providerInstanceId
    let resolvedModel = conv.model
    if (!providerId) {
      const defaultConfig = await this.getDefaultProvider.execute()
      providerId = defaultConfig.provider
      providerInstanceId = defaultConfig.providerInstanceId
      resolvedModel ??= defaultConfig.models[providerId as ProviderId] ?? null
    }

    let adapter = null
    if (providerInstanceId) {
      const instance = await this.providerInstanceRepository.findById(providerInstanceId)
      if (instance) {
        adapter = this.providerRegistry.createAdapter(instance)
      }
    }
    if (!adapter && providerId) {
      adapter = await this.providerRegistry.getAdapter(providerId as ProviderId)
    }
    if (!adapter) {
      throw new Error(`No provider available for conversation '${conversationId}'.`)
    }

    const locale = options.locale ?? DEFAULT_LOCALE
    const tr = (key: string, values?: TranslationParams) =>
      translate(locale, key, values)

    const transcript = messages
      .map(
        (m) =>
          `${m.role === "user" ? tr("titlePrompt.userLabel") : version.name}: ${m.content}`,
      )
      .join("\n\n")

    const context: PromptContext = {
      systemPrompt: [
        tr("titlePrompt.system"),
        tr("titlePrompt.rules"),
        tr("titlePrompt.only"),
        tr("titlePrompt.language"),
        tr("titlePrompt.names"),
        tr("titlePrompt.length"),
        tr("titlePrompt.essence"),
        tr("titlePrompt.noPunctuation"),
        tr("titlePrompt.noQuotes"),
        tr("titlePrompt.fallback"),
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [
            tr("titlePrompt.character", { name: version.name }) +
              (version.subtitle ? ` — ${version.subtitle}` : ""),
            version.description,
            "",
            tr("titlePrompt.conversation"),
            ...(latestSummary
              ? [tr("titlePrompt.previousSummary"), latestSummary.content, ""]
              : []),
            transcript,
            "",
            tr("titlePrompt.generate"),
          ].join("\n"),
        },
      ],
    }

    const model = resolvedModel ?? undefined
    let fullContent = ""

    try {
      for await (const chunk of adapter.generateStreaming(context, {
        model,
        temperature: 0.7,
        maxTokens: 50,
      })) {
        if (chunk.content) {
          fullContent += chunk.content
        }
      }
    } catch (err) {
      this.logger.error("Failed to generate conversation title", err as Error)
      throw new Error("Failed to generate title.", { cause: err })
    }

    const title = fullContent
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(/[.!?]+$/, "")
      .trim()
    if (!title) {
      throw new Error("Generated title is empty.")
    }

    const updated = conv.withTitle(title, "auto")
    await this.conversationRepository.update(updated)

    return { title, titleSource: "auto" }
  }
}
