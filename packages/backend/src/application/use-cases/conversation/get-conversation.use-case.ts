import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MessageDTO } from "@workspace/shared/types/message"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import { ConversationNotFoundError } from "../../../domain/errors"
import type { Message } from "../../../domain/entities/message.entity"
import { resolveEffectiveProfileImageAssetId } from "../../../domain/value-objects/effective-profile-image"

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly assetRepository: CharacterAssetRepository,
  ) {}

  async execute(id: string): Promise<ConversationDetail> {
    const convWithMessages = await this.conversationRepository.findByIdWithMessages(id)

    if (!convWithMessages) {
      throw new ConversationNotFoundError(id)
    }

    const version = await this.characterRepository.findVersionById(convWithMessages.conversation.versionId)
    const characterId = version?.characterId ?? ""
    const result = characterId ? await this.characterRepository.findById(characterId) : null
    const characterName = result?.currentVersion.name ?? version?.name ?? "Unknown"
    const profileImageAssetId = await resolveEffectiveProfileImageAssetId(
      convWithMessages.conversation.customProfileImageAssetId,
      result?.currentVersion.profileImageAssetId ?? null,
      this.assetRepository,
    )
    const backgroundImage = convWithMessages.conversation.backgroundImageAssetId
      ? await this.assetRepository.findById(
          convWithMessages.conversation.backgroundImageAssetId,
        )
      : null

    return {
      id: convWithMessages.conversation.id,
      characterId,
      characterName,
      profileImageAssetId,
      title: convWithMessages.conversation.title,
      titleSource: convWithMessages.conversation.titleSource,
      model: convWithMessages.conversation.model,
      provider: convWithMessages.conversation.provider,
      providerInstanceId: convWithMessages.conversation.providerInstanceId,
      recentMessageCount: convWithMessages.conversation.recentMessageCount,
      summaryFrequency: convWithMessages.conversation.summaryFrequency,
      temperature: convWithMessages.conversation.temperature,
      maxTokens: convWithMessages.conversation.maxTokens,
      topP: convWithMessages.conversation.topP,
      frequencyPenalty: convWithMessages.conversation.frequencyPenalty,
      presencePenalty: convWithMessages.conversation.presencePenalty,
      stopSequences: convWithMessages.conversation.stopSequences,
      memoryProposalMode: convWithMessages.conversation.memoryProposalMode,
      customProfileImageAssetId: convWithMessages.conversation.customProfileImageAssetId,
      backgroundImageAssetId: convWithMessages.conversation.backgroundImageAssetId,
      backgroundImageDimensions:
        backgroundImage?.width && backgroundImage.height
          ? { width: backgroundImage.width, height: backgroundImage.height }
          : null,
      backgroundFit: convWithMessages.conversation.backgroundFit,
      backgroundScrim: convWithMessages.conversation.backgroundScrim,
      messageStyle: convWithMessages.conversation.messageStyle,
      characterDialogueColor: convWithMessages.conversation.characterDialogueColor,
      userDialogueColor: convWithMessages.conversation.userDialogueColor,
      playerCharacterId: convWithMessages.conversation.playerCharacterId,
      memoryDecayMode: convWithMessages.conversation.memoryDecayMode,
      memoryDecayThreshold: convWithMessages.conversation.memoryDecayThreshold,
      memoryDecayAgeThreshold: convWithMessages.conversation.memoryDecayAgeThreshold,
      memoryDecaySpeed: convWithMessages.conversation.memoryDecaySpeed,
      createdAt: convWithMessages.conversation.createdAt.toISOString(),
      updatedAt: convWithMessages.conversation.updatedAt.toISOString(),
      messages: convWithMessages.messages.map(toMessageDTO),
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
