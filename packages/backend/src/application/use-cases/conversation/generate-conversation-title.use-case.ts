import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { ProviderId, ProviderRegistry } from "../../../domain/ports/provider.port"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import {
  ConversationNotFoundError,
} from "../../../domain/errors"
import type { PromptContext } from "../../../domain/value-objects/prompt-context"
import type { Locale } from "@workspace/shared/i18n"

export interface GenerateConversationTitleOptions {
  /** Explicit user action: allow replacing a manual title. */
  force?: boolean
  /** UI language, used only when the conversation is too short to infer one. */
  locale?: Locale
}

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
}

export class GenerateConversationTitleUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly providerRegistry: ProviderRegistry,
    private readonly getDefaultProvider: GetDefaultProviderUseCase,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    conversationId: string,
    options: GenerateConversationTitleOptions = {},
  ): Promise<{ title: string }> {
    const conv = await this.conversationRepository.findById(conversationId)
    if (!conv) {
      throw new ConversationNotFoundError(conversationId)
    }

    if (!options.force && conv.titleSource === "manual" && conv.title) {
      return { title: conv.title }
    }

    const version = await this.characterRepository.findVersionById(conv.versionId)
    if (!version) {
      throw new Error(`Character version '${conv.versionId}' not found.`)
    }

    const messages = await this.messageRepository.findByConversationId(conversationId)
    if (messages.length === 0) {
      throw new Error("Cannot generate title: conversation has no messages.")
    }

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

    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : version.name}: ${m.content}`)
      .join("\n\n")
    const languageHint = options.locale
      ? `- If the conversation is too short to infer a language, write the title in ${LANGUAGE_NAMES[options.locale]}.`
      : null

    const context: PromptContext = {
      systemPrompt: [
        "You generate short, descriptive titles for roleplay conversations.",
        "## Rules",
        "- Output ONLY the title, without explanations or extra formatting.",
        "- Write the title in the same language as the conversation below. Do not translate it.",
        "- Keep character and place names exactly as they appear.",
        "- Use 3 to 8 words.",
        "- Capture the essence of the conversation.",
        "- Do not end with punctuation.",
        "- Do not wrap the title in quotes.",
        languageHint,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n"),
      messages: [
        {
          role: "user",
          content: [
            `Character: ${version.name}${version.subtitle ? ` — ${version.subtitle}` : ""}`,
            version.description,
            "",
            "Conversation:",
            transcript,
            "",
            "Generate the title.",
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

    return { title }
  }
}
