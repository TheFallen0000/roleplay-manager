import type { ConversationSettingsUpdate } from "@workspace/shared/types/conversation"
import type {
  ApplySettingsTemplateResult,
  ExportSettings,
  SettingsTemplateWarning,
} from "@workspace/shared/types/export"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import { CharacterNotFoundError } from "../../../domain/errors"
import { isValidDialogueColor } from "@workspace/shared/lib/dialogue-color"
import { isMessageStyle } from "@workspace/shared/lib/message-style"
import { clampCompactionThreshold } from "@workspace/shared/lib/compaction"
import {
  clampContextWindow,
  clampOutputTokens,
} from "@workspace/shared/lib/inference"
import { findCharacterConversations } from "../conversation/find-character-conversations"
import type { UpdateConversationSettingsUseCase } from "../conversation/update-conversation-settings.use-case"
import type { CharacterAssetWriter } from "../../services/store-character-asset.service"

export interface ApplySettingsTemplateInput {
  characterId: string
  settings: Partial<ExportSettings>
  /** Custom chat image of the template, when it travels with one. */
  image?: { assetId: string; mimeType: string; base64: string }
}

export class ApplySettingsTemplateUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly updateConversationSettings: UpdateConversationSettingsUseCase,
    private readonly assetRepository: CharacterAssetRepository,
    private readonly storeCharacterAsset: CharacterAssetWriter,
  ) {}

  async execute(
    input: ApplySettingsTemplateInput,
  ): Promise<ApplySettingsTemplateResult> {
    const character = await this.characterRepository.findById(input.characterId)
    if (!character) {
      throw new CharacterNotFoundError(input.characterId)
    }

    const conversations = await findCharacterConversations(
      this.conversationRepository,
      input.characterId,
    )

    const warnings: SettingsTemplateWarning[] = []
    if (conversations.length === 0) {
      warnings.push("NO_CONVERSATIONS")
    }

    const customProfileImageAssetId = await this.resolveCustomImageUpdate(
      input,
      warnings,
    )

    const baseUpdate: ConversationSettingsUpdate = {
      ...toSettingsUpdate(input.settings),
      ...(await this.resolveProviderUpdate(input.settings, warnings)),
      ...(customProfileImageAssetId !== undefined
        ? { customProfileImageAssetId }
        : {}),
      force: true,
    }

    for (const conversation of conversations) {
      // The settings use case clamps values in place, so each conversation
      // gets its own copy.
      await this.updateConversationSettings.execute(conversation.id, {
        ...baseUpdate,
      })
    }

    return { applied: conversations.length, warnings }
  }

  /**
   * The template's custom chat image: recreated from the base64 it carries, or
   * reused when the referenced asset already exists locally. A template that
   * cannot resolve its image is applied without it (with a warning).
   */
  private async resolveCustomImageUpdate(
    input: ApplySettingsTemplateInput,
    warnings: SettingsTemplateWarning[],
  ): Promise<string | null | undefined> {
    const requested = input.settings.customProfileImageAssetId
    if (requested === undefined) return undefined
    if (requested === null) return null

    if (input.image && input.image.assetId === requested) {
      const asset = await this.storeCharacterAsset.store({
        characterId: input.characterId,
        mimeType: input.image.mimeType,
        data: Buffer.from(input.image.base64, "base64"),
        createdAt: new Date(),
        usage: ["profile"],
      })
      return asset.id
    }

    if (await this.assetRepository.findById(requested)) {
      return requested
    }

    warnings.push("CUSTOM_IMAGE_NOT_FOUND")
    return undefined
  }

  private async resolveProviderUpdate(
    settings: Partial<ExportSettings>,
    warnings: SettingsTemplateWarning[],
  ): Promise<ConversationSettingsUpdate> {
    const provider = settings.provider
    if (provider === undefined || provider === null) {
      return {}
    }

    const modelUpdate =
      settings.model !== undefined ? { model: settings.model } : {}

    if (provider === "ollama") {
      return { provider: "ollama", providerInstanceId: null, ...modelUpdate }
    }

    if (provider !== "openai-compatible") {
      warnings.push("PROVIDER_UNSUPPORTED")
      return {}
    }

    const instanceId = settings.providerInstanceId ?? null
    const instance = instanceId
      ? await this.providerInstanceRepository.findById(instanceId)
      : null
    if (!instance) {
      warnings.push("PROVIDER_INSTANCE_NOT_FOUND")
      return {}
    }

    return {
      provider: "openai-compatible",
      providerInstanceId: instanceId,
      ...modelUpdate,
    }
  }
}

function toSettingsUpdate(
  settings: Partial<ExportSettings>,
): ConversationSettingsUpdate {
  const update: ConversationSettingsUpdate = {}

  if (settings.recentMessageCount !== undefined) {
    update.recentMessageCount = settings.recentMessageCount
  }
  if (settings.summaryFrequency !== undefined) {
    update.summaryFrequency = settings.summaryFrequency
  }
  if (settings.contextWindow !== undefined) {
    update.contextWindow = clampContextWindow(settings.contextWindow)
  }
  if (settings.compactionThreshold !== undefined) {
    update.compactionThreshold = clampCompactionThreshold(
      settings.compactionThreshold,
    )
  }
  if (settings.temperature !== undefined) {
    update.temperature = settings.temperature
  }
  if (settings.maxTokens !== undefined) {
    update.maxTokens = clampOutputTokens(settings.maxTokens)
  }
  if (settings.topP !== undefined) {
    update.topP = settings.topP
  }
  if (settings.frequencyPenalty !== undefined) {
    update.frequencyPenalty = settings.frequencyPenalty
  }
  if (settings.presencePenalty !== undefined) {
    update.presencePenalty = settings.presencePenalty
  }
  if (settings.stopSequences !== undefined) {
    update.stopSequences = settings.stopSequences
  }
  if (settings.memoryProposalMode !== undefined) {
    update.memoryProposalMode = settings.memoryProposalMode
  }
  if (settings.memoryDecayMode !== undefined) {
    update.memoryDecayMode = settings.memoryDecayMode
  }
  if (settings.memoryDecayThreshold !== undefined) {
    update.memoryDecayThreshold = settings.memoryDecayThreshold
  }
  if (settings.memoryDecayAgeThreshold !== undefined) {
    update.memoryDecayAgeThreshold = settings.memoryDecayAgeThreshold
  }
  if (settings.memoryDecaySpeed !== undefined) {
    update.memoryDecaySpeed = settings.memoryDecaySpeed
  }
  if (isMessageStyle(settings.messageStyle)) {
    update.messageStyle = settings.messageStyle
  }
  if (
    settings.characterDialogueColor === null ||
    isValidDialogueColor(settings.characterDialogueColor)
  ) {
    update.characterDialogueColor = settings.characterDialogueColor ?? null
  }
  if (
    settings.userDialogueColor === null ||
    isValidDialogueColor(settings.userDialogueColor)
  ) {
    update.userDialogueColor = settings.userDialogueColor ?? null
  }

  return update
}
