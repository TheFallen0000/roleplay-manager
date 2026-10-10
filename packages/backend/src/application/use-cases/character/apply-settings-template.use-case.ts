import type { ConversationSettingsUpdate } from "@workspace/shared/types/conversation"
import type {
  ApplySettingsTemplateResult,
  ExportSettings,
  SettingsTemplateWarning,
} from "@workspace/shared/types/export"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import { CharacterNotFoundError } from "../../../domain/errors"
import { isValidDialogueColor } from "@workspace/shared/lib/dialogue-color"
import { isMessageStyle } from "@workspace/shared/lib/message-style"
import { findCharacterConversations } from "../conversation/find-character-conversations"
import type { UpdateConversationSettingsUseCase } from "../conversation/update-conversation-settings.use-case"

export interface ApplySettingsTemplateInput {
  characterId: string
  settings: Partial<ExportSettings>
}

export class ApplySettingsTemplateUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly updateConversationSettings: UpdateConversationSettingsUseCase,
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
      this.characterRepository,
      input.characterId,
    )

    const warnings: SettingsTemplateWarning[] = []
    if (conversations.length === 0) {
      warnings.push("NO_CONVERSATIONS")
    }

    const baseUpdate: ConversationSettingsUpdate = {
      ...toSettingsUpdate(input.settings),
      ...(await this.resolveProviderUpdate(input.settings, warnings)),
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
  if (settings.temperature !== undefined) {
    update.temperature = settings.temperature
  }
  if (settings.maxTokens !== undefined) {
    update.maxTokens = settings.maxTokens
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
