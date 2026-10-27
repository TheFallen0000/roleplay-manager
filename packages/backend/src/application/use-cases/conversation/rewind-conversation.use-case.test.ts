import { describe, it, expect } from "vitest"

import { RewindConversationUseCase } from "./rewind-conversation.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Summary } from "../../../domain/entities/summary.entity"

const now = new Date()

const buildConversation = (id: string): Conversation =>
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
    createdAt: now,
    updatedAt: now,
  })

const buildMsg = (id: string, position: number, role: "user" | "assistant" = "user"): Message =>
  Message.create({
    id,
    conversationId: "conv-1",
    role,
    content: `Message ${id}`,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  })

const buildSummary = (id: string, firstMessageId: string, lastMessageId: string): Summary =>
  Summary.reconstruct({
    id,
    conversationId: "conv-1",
    content: `Summary ${id}`,
    firstMessageId,
    lastMessageId,
    model: null,
    provider: null,
    createdAt: now,
    editedAt: null,
  })

const buildConversationRepo = (conversation: Conversation | null): ConversationRepository => ({
  create: async (c) => c,
  findById: async () => conversation,
  findByIdWithMessages: async () => null,
  list: async () => [],
  update: async (c) => c,
  updateSettings: async (_id, _s) => ({} as Conversation),
  clearProviderInstanceId: async () => {},
})

const buildMessageRepo = (initialMessages: Message[]): MessageRepository => {
  const messages = [...initialMessages]
  return {
    create: async (m) => m,
    findById: async () => null,
    findByConversationId: async () => messages,
    findLastByConversationId: async () => null,
    update: async (m) => m,
    deleteById: async (id) => {
      const idx = messages.findIndex((m) => m.id === id)
      if (idx !== -1) messages.splice(idx, 1)
    },
    deleteAfterPosition: async (_convId, position) => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].position > position) {
          messages.splice(i, 1)
        }
      }
    },
    clearAlternatives: async () => {},
  }
}

const buildMemoryRepo = (): MemoryChangeProposalRepository => ({
  create: async (p) => p,
  createMany: async () => {},
  findById: async () => null,
  findPendingByConversationId: async () => [],
  findByConversationId: async () => [],
  update: async (p) => p,
  markProcessed: async () => {},
  discardPendingByConversationId: async () => {},
})

const buildSummaryRepo = (summaries: Summary[]): SummaryRepository => ({
  findById: async () => null,
  findByConversationId: async () => summaries,
  findLatestByConversationId: async () => null,
  create: async (s) => s,
  update: async (s) => s,
  deleteById: async () => {},
  deleteByIds: async () => {},
})

describe("RewindConversationUseCase", () => {
  it("deletes summaries whose range intersects with rewound messages", async () => {
    // Messages at positions 0(assistant), 1(user), 2(assistant), 3(user), 4(assistant)
    const messages = [
      buildMsg("msg-0", 0, "assistant"),
      buildMsg("msg-1", 1),
      buildMsg("msg-2", 2, "assistant"),
      buildMsg("msg-3", 3),
      buildMsg("msg-4", 4, "assistant"),
    ]
    // sum-1 covers msg-1..msg-3 (positions 1-3)
    // sum-2 covers msg-0..msg-0 (position 0 only)
    const summaries = [
      buildSummary("sum-1", "msg-1", "msg-3"),
      buildSummary("sum-2", "msg-0", "msg-0"),
    ]

    // Rewind to msg-3 (user, pos 3): deletes positions >3 (msg-4) + target msg-3
    // Only sum-1 is affected (its lastMessageId msg-3 is deleted)
    // sum-2 is intact (msg-0 survives)
    const deletedIds: string[] = []
    const summaryRepo = buildSummaryRepo(summaries)
    summaryRepo.deleteByIds = async (ids) => { deletedIds.push(...ids) }

    const useCase = new RewindConversationUseCase(
      buildConversationRepo(buildConversation("conv-1")),
      buildMessageRepo(messages),
      buildMemoryRepo(),
      summaryRepo,
    )

    const result = await useCase.execute({
      conversationId: "conv-1",
      targetMessageId: "msg-3",
    })

    expect(deletedIds).toEqual(["sum-1"])
    expect(result.deletedMessageIds).toEqual(["msg-3", "msg-4"])
  })

  it("does not delete summaries whose range is intact", async () => {
    // Messages at positions 0(assistant), 1(user), 2(assistant)
    const messages = [
      buildMsg("msg-0", 0, "assistant"),
      buildMsg("msg-1", 1),
      buildMsg("msg-2", 2, "assistant"),
    ]
    // sum-1 covers msg-1..msg-2
    const summaries = [
      buildSummary("sum-1", "msg-1", "msg-2"),
    ]

    // Rewind to msg-2 (assistant, pos 2): no positions > 2, target is assistant
    // Nothing gets deleted → summary intact
    const deletedIds: string[] = []
    const summaryRepo = buildSummaryRepo(summaries)
    summaryRepo.deleteByIds = async (ids) => { deletedIds.push(...ids) }

    const useCase = new RewindConversationUseCase(
      buildConversationRepo(buildConversation("conv-1")),
      buildMessageRepo(messages),
      buildMemoryRepo(),
      summaryRepo,
    )

    const result = await useCase.execute({
      conversationId: "conv-1",
      targetMessageId: "msg-2",
    })

    expect(deletedIds).toEqual([])
    expect(result.deletedMessageIds).toEqual([])
  })

  it("throws if conversation does not exist", async () => {
    const useCase = new RewindConversationUseCase(
      buildConversationRepo(null),
      buildMessageRepo([]),
      buildMemoryRepo(),
      buildSummaryRepo([]),
    )

    await expect(
      useCase.execute({ conversationId: "nonexistent", targetMessageId: "msg-1" }),
    ).rejects.toThrow("not found")
  })

  it("throws if target message does not exist", async () => {
    const messages = [buildMsg("msg-1", 0, "assistant")]

    const useCase = new RewindConversationUseCase(
      buildConversationRepo(buildConversation("conv-1")),
      buildMessageRepo(messages),
      buildMemoryRepo(),
      buildSummaryRepo([]),
    )

    await expect(
      useCase.execute({ conversationId: "conv-1", targetMessageId: "nonexistent" }),
    ).rejects.toThrow("not found")
  })
})
