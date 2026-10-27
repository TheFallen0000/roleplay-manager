import type { ConversationDetail } from "@workspace/shared/types/conversation"
import {
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE,
} from "@workspace/shared/types/conversation"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterSummaryRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import { ConversationNotFoundError } from "../../../domain/errors"
import { resolveEffectiveProfileImageAssetId } from "../../../domain/value-objects/effective-profile-image"
import { toMessageDTO } from "./list-conversation-messages.use-case"

export interface GetConversationOptions {
  messageLimit?: number
}

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly characterRepository: CharacterSummaryRepository,
    private readonly assetRepository: CharacterAssetRepository,
    private readonly messageRepository: MessageHistoryRepository,
  ) {}

  async execute(
    id: string,
    options: GetConversationOptions = {},
  ): Promise<ConversationDetail> {
    const conversation = await this.conversationRepository.findById(id)
    if (!conversation) {
      throw new ConversationNotFoundError(id)
    }

    const limit = Math.min(
      Math.max(options.messageLimit ?? DEFAULT_MESSAGE_PAGE_SIZE, 1),
      MAX_MESSAGE_PAGE_SIZE,
    )
    const page = await this.messageRepository.findPageByConversationId(id, {
      limit,
    })
    const nextCursor = page.hasMore
      ? page.messages[0]?.position ?? null
      : null

    const [version] = await this.characterRepository.findVersionSummariesByIds([
      conversation.versionId,
    ])
    const currentVersion = version
      ? await this.characterRepository.findCurrentVersionSummaryByCharacterId(
          version.characterId,
        )
      : null
    const characterId =
      currentVersion?.characterId ?? version?.characterId ?? ""
    const characterName =
      currentVersion?.name ?? version?.name ?? "Unknown"
    const profileImageAssetId = await resolveEffectiveProfileImageAssetId(
      conversation.customProfileImageAssetId,
      currentVersion?.profileImageAssetId ?? null,
      this.assetRepository,
    )
    const backgroundImage = conversation.backgroundImageAssetId
      ? await this.assetRepository.findById(conversation.backgroundImageAssetId)
      : null

    return {
      id: conversation.id,
      characterId,
      characterName,
      profileImageAssetId,
      title: conversation.title,
      titleSource: conversation.titleSource,
      model: conversation.model,
      provider: conversation.provider,
      providerInstanceId: conversation.providerInstanceId,
      recentMessageCount: conversation.recentMessageCount,
      summaryFrequency: conversation.summaryFrequency,
      temperature: conversation.temperature,
      maxTokens: conversation.maxTokens,
      topP: conversation.topP,
      frequencyPenalty: conversation.frequencyPenalty,
      presencePenalty: conversation.presencePenalty,
      stopSequences: conversation.stopSequences,
      memoryProposalMode: conversation.memoryProposalMode,
      customProfileImageAssetId: conversation.customProfileImageAssetId,
      backgroundImageAssetId: conversation.backgroundImageAssetId,
      backgroundImageDimensions:
        backgroundImage?.width && backgroundImage.height
          ? { width: backgroundImage.width, height: backgroundImage.height }
          : null,
      backgroundFit: conversation.backgroundFit,
      backgroundScrim: conversation.backgroundScrim,
      messageStyle: conversation.messageStyle,
      characterDialogueColor: conversation.characterDialogueColor,
      userDialogueColor: conversation.userDialogueColor,
      playerCharacterId: conversation.playerCharacterId,
      memoryDecayMode: conversation.memoryDecayMode,
      memoryDecayThreshold: conversation.memoryDecayThreshold,
      memoryDecayAgeThreshold: conversation.memoryDecayAgeThreshold,
      memoryDecaySpeed: conversation.memoryDecaySpeed,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: page.messages.map(toMessageDTO),
      messagesHasMore: page.hasMore,
      messagesNextCursor: nextCursor,
    }
  }
}
