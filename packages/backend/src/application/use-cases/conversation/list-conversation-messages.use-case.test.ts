import { describe, expect, it, vi } from "vitest"

import { ListConversationMessagesUseCase } from "./list-conversation-messages.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"

const now = new Date("2026-10-27T12:00:00.000Z")
const conversation = Conversation.create({
  id: "conv-1",
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

const buildConversationRepo = (found = true): ConversationRepository => ({
  create: async (c) => c,
  findById: async () => (found ? conversation : null),
  findByIdWithMessages: async () => null,
  listByCharacterId: async () => [],
  list: async () => [],
  update: async (c) => c,
  updateSettings: async () => conversation,
  clearProviderInstanceId: async () => {},
})

const buildHistory = (): MessageHistoryRepository => ({
  findPageByConversationId: vi.fn(async () => ({
    messages: [message("msg-1", 0), message("msg-2", 1)],
    hasMore: true,
  })),
  findRecentByConversationId: vi.fn(async () => []),
  findAfterPosition: vi.fn(async () => []),
  findPositionById: vi.fn(async () => null),
  findMaxPosition: vi.fn(async () => 1),
  countByConversationId: vi.fn(async () => 2),
  findUserMessageTimes: vi.fn(async () => []),
  findStatsByConversationIds: vi.fn(async () => []),
})

describe("ListConversationMessagesUseCase", () => {
  it("returns the latest page with a cursor when there is more history", async () => {
    const history = buildHistory()
    const useCase = new ListConversationMessagesUseCase(
      buildConversationRepo(),
      history,
    )

    const result = await useCase.execute("conv-1")

    expect(history.findPageByConversationId).toHaveBeenCalledWith("conv-1", {
      before: undefined,
      limit: 50,
    })
    expect(result.messages.map((item) => item.id)).toEqual(["msg-1", "msg-2"])
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe(0)
  })

  it("passes the cursor and clamp the limit", async () => {
    const history = buildHistory()
    const useCase = new ListConversationMessagesUseCase(
      buildConversationRepo(),
      history,
    )

    await useCase.execute("conv-1", { before: 42, limit: 999 })

    expect(history.findPageByConversationId).toHaveBeenCalledWith("conv-1", {
      before: 42,
      limit: 200,
    })
  })

  it("throws when the conversation does not exist", async () => {
    const useCase = new ListConversationMessagesUseCase(
      buildConversationRepo(false),
      buildHistory(),
    )

    await expect(useCase.execute("missing")).rejects.toThrow(
      "Conversation with id 'missing' not found.",
    )
  })
})
