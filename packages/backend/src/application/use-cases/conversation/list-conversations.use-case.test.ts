import { describe, it, expect, vi } from "vitest"

import { ListConversationsUseCase } from "./list-conversations.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import type {
  CharacterSummaryRepository,
  CharacterVersionSummary,
  CharacterWithCurrentVersionSummary,
} from "../../../domain/ports/character.repository"
import type { CharacterAssetLookupRepository } from "../../../domain/ports/character-asset.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Character } from "../../../domain/entities/character.entity"

const now = new Date("2026-10-27T12:00:00.000Z")
const older = new Date("2026-10-01T12:00:00.000Z")

const character = Character.create({
  id: "char-1",
  name: "Test",
  createdAt: now,
  updatedAt: now,
})

const currentVersion: CharacterVersionSummary = {
  id: "ver-1",
  characterId: "char-1",
  name: "Test",
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
}

const conversation = (
  id: string,
  updatedAt: Date,
  overrides: Partial<Parameters<typeof Conversation.create>[0]> = {},
): Conversation =>
  Conversation.create({
    id,
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: null,
    provider: null,
    providerInstanceId: null,
    recentMessageCount: 10,
    summaryFrequency: 20,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  })

const buildConversationRepo = (
  conversations: Conversation[],
): ConversationRepository => ({
  create: async (c) => c,
  findById: async () => null,
  findByIdWithMessages: async () => null,
  listByCharacterId: async () => [],
  listByCharacterIds: async () => conversations,
  list: async () => conversations,
  update: async (c) => c,
  updateSettings: async (_id: string, _settings) => conversations[0],
  clearProviderInstanceId: async () => {},
})

const buildMessageHistory = (
  stats: Array<{
    conversationId: string
    messageCount: number
    lastMessageAt: Date | null
  }>,
): MessageHistoryRepository => ({
  findPageByConversationId: vi.fn(async () => ({ messages: [], hasMore: false })),
  findRecentByConversationId: vi.fn(async () => []),
  findAfterPosition: vi.fn(async () => []),
  findPositionById: vi.fn(async () => null),
  findMaxPosition: vi.fn(async () => -1),
  countByConversationId: vi.fn(async () => 0),
  findUserMessageTimes: vi.fn(async () => []),
  findStatsByConversationIds: vi.fn(async () => stats),
})

const buildCharacterRepo = (
  current: CharacterWithCurrentVersionSummary[] = [
    { character, currentVersion },
  ],
  versions: CharacterVersionSummary[] = [currentVersion],
): CharacterSummaryRepository => ({
  listCurrentVersionSummaries: vi.fn(async () => current),
  listCurrentVersionSummariesPage: vi.fn(async ({ limit, offset }) => ({
    entries: current.slice(offset, offset + limit),
    hasMore: false,
    nextOffset: null,
  })),
  findCurrentVersionSummaryByCharacterId: vi.fn(
    async () => current[0]?.currentVersion ?? null,
  ),
  findVersionSummariesByIds: vi.fn(async () => versions),
})

const buildAssetRepo = (
  assets: Array<{
    id: string
    characterId: string
    mimeType: string
    sizeBytes: number
    extension: string
    width: number | null
    height: number | null
    createdAt: Date
  }> = [],
): CharacterAssetLookupRepository => ({
  findByIds: vi.fn(async () => assets),
})

describe("ListConversationsUseCase", () => {
  it("retorna lista de conversaciones con resumen", async () => {
    const useCase = new ListConversationsUseCase(
      buildConversationRepo([conversation("conv-1", now)]),
      buildMessageHistory([
        { conversationId: "conv-1", messageCount: 5, lastMessageAt: now },
      ]),
      buildCharacterRepo(),
      buildAssetRepo(),
    )

    const result = await useCase.execute()

    expect(result).toHaveLength(1)
    expect(result[0].characterName).toBe("Test")
    expect(result[0].messageCount).toBe(5)
    expect(result[0].lastActivityAt).toBe(now.toISOString())
  })

  it("ordena por lastActivityAt descendente", async () => {
    const useCase = new ListConversationsUseCase(
      buildConversationRepo([
        conversation("old-conv", older),
        conversation("recent-conv", now),
      ]),
      buildMessageHistory([
        { conversationId: "old-conv", messageCount: 1, lastMessageAt: older },
        { conversationId: "recent-conv", messageCount: 1, lastMessageAt: now },
      ]),
      buildCharacterRepo(),
      buildAssetRepo(),
    )

    const result = await useCase.execute()
    expect(result[0].id).toBe("recent-conv")
    expect(result[1].id).toBe("old-conv")
  })

  it("usa la imagen personalizada solo si el asset existe", async () => {
    const assets = [
      {
        id: "asset-custom",
        characterId: "char-1",
        mimeType: "image/png",
        sizeBytes: 10,
        extension: "png",
        width: 100,
        height: 100,
        createdAt: now,
      },
    ]
    const useCase = new ListConversationsUseCase(
      buildConversationRepo([
        conversation("conv-1", now, {
          customProfileImageAssetId: "asset-custom",
        }),
        conversation("conv-2", now, {
          customProfileImageAssetId: "asset-missing",
        }),
      ]),
      buildMessageHistory([
        { conversationId: "conv-1", messageCount: 1, lastMessageAt: now },
        { conversationId: "conv-2", messageCount: 1, lastMessageAt: now },
      ]),
      buildCharacterRepo(),
      buildAssetRepo(assets),
    )

    const result = await useCase.execute()

    expect(result[0].profileImageAssetId).toBe("asset-custom")
    expect(result[1].profileImageAssetId).toBeNull()
  })

  it("cae a updatedAt si la conversación no tiene mensajes", async () => {
    const useCase = new ListConversationsUseCase(
      buildConversationRepo([conversation("conv-1", older)]),
      buildMessageHistory([
        { conversationId: "conv-1", messageCount: 0, lastMessageAt: null },
      ]),
      buildCharacterRepo(),
      buildAssetRepo(),
    )

    const result = await useCase.execute()
    expect(result[0].lastActivityAt).toBe(older.toISOString())
  })
})
