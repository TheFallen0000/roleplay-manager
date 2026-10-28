import type { ConversationSummary } from "@workspace/shared/types/conversation"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import type { CharacterSummaryRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetLookupRepository } from "../../../domain/ports/character-asset.repository"

export interface ListConversationsOptions {
  characterIds?: string[]
  limit?: number
}

export class ListConversationsUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageHistoryRepository,
    private readonly characterRepository: CharacterSummaryRepository,
    private readonly assetRepository: CharacterAssetLookupRepository,
  ) {}

  async execute(
    options: ListConversationsOptions = {},
  ): Promise<ConversationSummary[]> {
    const conversations =
      options.characterIds && options.characterIds.length > 0
        ? await this.conversationRepository.listByCharacterIds(
            options.characterIds,
            options.limit,
          )
        : await this.conversationRepository.list(options.limit)
    const conversationIds = conversations.map((conversation) => conversation.id)
    const versionIds = [
      ...new Set(conversations.map((conversation) => conversation.versionId)),
    ]

    const [stats, versions, currentVersions] = await Promise.all([
      this.messageRepository.findStatsByConversationIds(conversationIds),
      this.characterRepository.findVersionSummariesByIds(versionIds),
      this.characterRepository.listCurrentVersionSummaries(),
    ])

    const statsByConversation = new Map(
      stats.map((entry) => [entry.conversationId, entry]),
    )
    const versionsById = new Map(versions.map((version) => [version.id, version]))
    const currentByCharacter = new Map(
      currentVersions.map((entry) => [entry.character.id, entry.currentVersion]),
    )

    const assetIds = new Set<string>()
    for (const conversation of conversations) {
      if (conversation.customProfileImageAssetId) {
        assetIds.add(conversation.customProfileImageAssetId)
      }
      const version = versionsById.get(conversation.versionId)
      const current = version
        ? currentByCharacter.get(version.characterId)
        : undefined
      if (current?.profileImageAssetId) {
        assetIds.add(current.profileImageAssetId)
      }
    }
    const assets = await this.assetRepository.findByIds([...assetIds])
    const existingAssetIds = new Set(assets.map((asset) => asset.id))

    const summaries: ConversationSummary[] = conversations.map((conversation) => {
      const version = versionsById.get(conversation.versionId)
      const current = version
        ? currentByCharacter.get(version.characterId)
        : undefined
      const stats = statsByConversation.get(conversation.id)
      const customProfileImageAssetId =
        conversation.customProfileImageAssetId &&
        existingAssetIds.has(conversation.customProfileImageAssetId)
          ? conversation.customProfileImageAssetId
          : null
      const profileImageAssetId =
        customProfileImageAssetId ?? current?.profileImageAssetId ?? null

      return {
        id: conversation.id,
        characterId: current?.characterId ?? version?.characterId ?? "",
        characterName: current?.name ?? version?.name ?? "Unknown",
        profileImageAssetId,
        title: conversation.title,
        messageCount: stats?.messageCount ?? 0,
        lastActivityAt: (
          stats?.lastMessageAt ?? conversation.updatedAt
        ).toISOString(),
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      }
    })

    summaries.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    )

    return summaries
  }
}
