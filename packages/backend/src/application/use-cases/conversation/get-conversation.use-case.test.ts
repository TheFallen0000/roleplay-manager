import { describe, it, expect, vi } from "vitest"

import { GetConversationUseCase } from "./get-conversation.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type {
  CharacterSummaryRepository,
  CharacterVersionSummary,
} from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"

const now = new Date("2026-10-27T12:00:00.000Z")

const conversation = Conversation.create({
  id: "conv-1",
  versionId: "ver-2",
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
  createdAt: now,
  updatedAt: now,
})

const message = (id: string, position: number): Message =>
  Message.create({
    id,
    conversationId: "conv-1",
    role: "assistant",
    content: `Message ${id}`,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  })

const versionSummary: CharacterVersionSummary = {
  id: "ver-1",
  characterId: "char-1",
  name: "Test",
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
}

const buildConversationRepo = (): ConversationRepository => ({
  create: async (c) => c,
  findById: async (id) => (id === "conv-1" ? conversation : null),
  findByIdWithMessages: async () => null,
  list: async () => [],
  update: async (c) => c,
  updateSettings: async (_id: string, _settings) => conversation,
  clearProviderInstanceId: async () => {},
})

const buildCharacterRepo = (): CharacterSummaryRepository => ({
  listCurrentVersionSummaries: async () => [],
  findCurrentVersionSummaryByCharacterId: async () => versionSummary,
  findVersionSummariesByIds: async () => [versionSummary],
})

const buildAssetRepo = (): CharacterAssetRepository => ({
  create: async () => {},
  findById: async () => null,
  findByCharacterId: async () => [],
  deleteById: async () => {},
})

const buildMessageHistory = (
  messages: Message[] = [message("msg-1", 0)],
  hasMore = false,
): MessageHistoryRepository => ({
  findPageByConversationId: vi.fn(async () => ({
    messages,
    hasMore,
  })),
  findRecentByConversationId: vi.fn(async () => messages),
  findAfterPosition: vi.fn(async () => []),
  findPositionById: vi.fn(async () => null),
  findMaxPosition: vi.fn(async () => messages.length - 1),
  countByConversationId: vi.fn(async () => messages.length),
  findUserMessageTimes: vi.fn(async () => []),
  findStatsByConversationIds: vi.fn(async () => []),
})

describe("GetConversationUseCase", () => {
  it("retorna conversación con la primera página de mensajes", async () => {
    const useCase = new GetConversationUseCase(
      buildConversationRepo(),
      buildCharacterRepo(),
      buildAssetRepo(),
      buildMessageHistory([message("msg-1", 0), message("msg-2", 1)], true),
    )

    const result = await useCase.execute("conv-1")

    expect(result.id).toBe("conv-1")
    expect(result.characterName).toBe("Test")
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].content).toBe("Message msg-1")
    expect(result.messagesHasMore).toBe(true)
    expect(result.messagesNextCursor).toBe(0)
  })

  it("marca que no hay más mensajes cuando la página está completa", async () => {
    const useCase = new GetConversationUseCase(
      buildConversationRepo(),
      buildCharacterRepo(),
      buildAssetRepo(),
      buildMessageHistory([message("msg-1", 0)]),
    )

    const result = await useCase.execute("conv-1")

    expect(result.messagesHasMore).toBe(false)
    expect(result.messagesNextCursor).toBeNull()
  })

  it("lanza ConversationNotFoundError si no existe", async () => {
    const useCase = new GetConversationUseCase(
      buildConversationRepo(),
      buildCharacterRepo(),
      buildAssetRepo(),
      buildMessageHistory(),
    )

    await expect(useCase.execute("nonexistent")).rejects.toThrow(
      "Conversation with id 'nonexistent' not found.",
    )
  })
})
