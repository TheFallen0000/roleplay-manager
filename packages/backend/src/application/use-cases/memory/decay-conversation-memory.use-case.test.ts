import { describe, it, expect, vi } from "vitest"

import { DecayConversationMemoryUseCase } from "./decay-conversation-memory.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Memory } from "../../../domain/entities/memory.entity"
import { Message } from "../../../domain/entities/message.entity"
import { MAX_MEMORIES_DECAYED_PER_SWEEP } from "../../../domain/value-objects/memory-decay-policy"

const now = new Date("2026-07-31T12:00:00Z")

const buildConversation = (overrides: Partial<Parameters<typeof Conversation.create>[0]> = {}) =>
  Conversation.create({
    id: "conv-1",
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: null,
    provider: "ollama",
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
    ...overrides,
  })

const buildMemory = (id: string, priority: number, updatedAt: Date): Memory =>
  Memory.create({
    id,
    conversationId: "conv-1",
    actor: "Test",
    title: `Memory ${id}`,
    description: "A test memory",
    priority,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: updatedAt,
    updatedAt,
  })

const buildTimeline = (count: number, role: "user" | "assistant" = "user"): Message[] =>
  Array.from({ length: count }, (_, i) =>
    Message.create({
      id: `msg-${i}`,
      conversationId: "conv-1",
      role,
      content: `Message ${i}`,
      position: i,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: new Date(now.getTime() + (i + 1) * 60_000),
      editedAt: null,
    }),
  )

const buildRepos = ({
  conversation,
  memories,
  messages,
}: {
  conversation: Conversation
  memories: Memory[]
  messages: Message[]
}) => {
  const deletedIds: string[] = []
  const memoryRepo: MemoryRepository = {
    findById: async () => null,
    findByConversationId: async () => memories,
    create: async (m) => m,
    update: async (m) => m,
    deleteById: async (id) => {
      deletedIds.push(id)
    },
  }
  const conversationRepo: ConversationRepository = {
    create: async (c) => c,
    findById: async () => conversation,
    findByIdWithMessages: async () => null,
    list: async () => [],
    update: async (c) => c,
    updateSettings: async (_id, _s) => conversation,
    clearProviderInstanceId: async () => {},
  }
  const messageRepo: MessageRepository = {
    create: async (m) => m,
    findByConversationId: async () => messages,
    findById: async () => null,
    findLastByConversationId: async () => null,
    update: async (m) => m,
    deleteById: async () => {},
    deleteAfterPosition: async () => {},
    clearAlternatives: async () => {},
  }
  const logger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => logger,
  }
  return { memoryRepo, conversationRepo, messageRepo, logger, deletedIds }
}

describe("DecayConversationMemoryUseCase", () => {
  it("elimina memorias con prioridad efectiva bajo el umbral y antigüedad suficiente (decaySpeed 1)", async () => {
    // decaySpeed = 1: each turn loses -1 priority.
    // 35 messages after updatedAt → priority 5 drops to 1 → candidate.
    const conversation = buildConversation({
      memoryDecayMode: "silent",
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 30,
      memoryDecaySpeed: 1,
    })
    const oldMemory = buildMemory("m-old", 5, new Date(now.getTime() - 60_000))
    const freshMemory = buildMemory("m-fresh", 1, new Date(now.getTime() + 30 * 60_000))
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories: [oldMemory, freshMemory],
        messages: buildTimeline(35),
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const result = await useCase.execute({ conversationId: "conv-1" })

    expect(result.deleted).toBe(1)
    expect(deletedIds).toEqual(["m-old"])
  })

  it("no elimina si la prioridad efectiva no ha caído bajo el umbral", async () => {
    // decaySpeed = 10: 35 turns → -3 priority → 5-3 = 2... with threshold 3 it would be a candidate.
    // Use decaySpeed 100 so it does not decay: 35/100 = 0 → priority 5 > 3.
    const conversation = buildConversation({
      memoryDecayMode: "silent",
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 30,
      memoryDecaySpeed: 100,
    })
    const memory = buildMemory("m-high", 5, new Date(now.getTime() - 60_000))
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories: [memory],
        messages: buildTimeline(35),
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const result = await useCase.execute({ conversationId: "conv-1" })

    expect(result.deleted).toBe(0)
    expect(deletedIds).toEqual([])
  })

  it("no elimina si la memoria no tiene la antigüedad mínima", async () => {
    // Only 5 turns: effective priority 1 (5 - 5 with decaySpeed 1) but turns < 30.
    const conversation = buildConversation({
      memoryDecayMode: "silent",
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 30,
      memoryDecaySpeed: 1,
    })
    const memory = buildMemory("m-recent", 5, new Date(now.getTime() - 60_000))
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories: [memory],
        messages: buildTimeline(5),
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const result = await useCase.execute({ conversationId: "conv-1" })

    expect(result.deleted).toBe(0)
    expect(deletedIds).toEqual([])
  })

  it("no cuenta las respuestas del asistente como turnos", async () => {
    // 35 assistant replies, 0 user messages → turns = 0 → not a candidate.
    const conversation = buildConversation({
      memoryDecayMode: "silent",
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 30,
      memoryDecaySpeed: 1,
    })
    const memory = buildMemory("m-old", 5, new Date(now.getTime() - 60_000))
    const assistantReplies = buildTimeline(35, "assistant")
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories: [memory],
        messages: assistantReplies,
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const result = await useCase.execute({ conversationId: "conv-1" })

    expect(result.deleted).toBe(0)
    expect(deletedIds).toEqual([])
  })

  it("modo off: nunca elimina", async () => {
    const conversation = buildConversation({ memoryDecayMode: "off" })
    const memory = buildMemory("m-old", 1, new Date(now.getTime() - 60_000))
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories: [memory],
        messages: buildTimeline(35),
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const autoResult = await useCase.execute({ conversationId: "conv-1" })
    const manualResult = await useCase.execute({ conversationId: "conv-1", manual: true })

    expect(autoResult.deleted).toBe(0)
    expect(manualResult.deleted).toBe(0)
    expect(deletedIds).toEqual([])
  })

  it("modo manual: solo elimina cuando manual es true", async () => {
    const conversation = buildConversation({
      memoryDecayMode: "manual",
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 30,
      memoryDecaySpeed: 1,
    })
    const memory = buildMemory("m-old", 5, new Date(now.getTime() - 60_000))
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories: [memory],
        messages: buildTimeline(35),
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const autoResult = await useCase.execute({ conversationId: "conv-1" })
    expect(autoResult.deleted).toBe(0)
    expect(deletedIds).toEqual([])

    const manualResult = await useCase.execute({ conversationId: "conv-1", manual: true })
    expect(manualResult.deleted).toBe(1)
    expect(deletedIds).toEqual(["m-old"])
  })

  it("respeta el límite de 100 memorias por barrido (menor prioridad efectiva primero)", async () => {
    const conversation = buildConversation({
      memoryDecayMode: "silent",
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 30,
      memoryDecaySpeed: 1,
    })
    const memories = Array.from({ length: 120 }, (_, i) =>
      buildMemory(`m-${i}`, 5, new Date(now.getTime() - 60_000)),
    )
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories,
        messages: buildTimeline(35),
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const result = await useCase.execute({ conversationId: "conv-1" })

    expect(result.deleted).toBe(MAX_MEMORIES_DECAYED_PER_SWEEP)
    expect(deletedIds.length).toBe(100)
  })

  it("lanza ConversationNotFoundError si la conversación no existe", async () => {
    const conversation = buildConversation()
    const { memoryRepo, messageRepo, logger } = buildRepos({
      conversation,
      memories: [],
      messages: [],
    })
    const conversationRepo: ConversationRepository = {
      create: async (c) => c,
      findById: async () => null,
      findByIdWithMessages: async () => null,
      list: async () => [],
      update: async (c) => c,
      updateSettings: async (_id, _s) => conversation,
      clearProviderInstanceId: async () => {},
    }

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    await expect(
      useCase.execute({ conversationId: "nonexistent" }),
    ).rejects.toThrow("not found")
  })

  it("ejecuta el barrido también en modo silent cuando manual es true", async () => {
    const conversation = buildConversation({
      memoryDecayMode: "silent",
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 30,
      memoryDecaySpeed: 1,
    })
    const memory = buildMemory("m-old", 5, new Date(now.getTime() - 60_000))
    const { memoryRepo, conversationRepo, messageRepo, logger, deletedIds } =
      buildRepos({
        conversation,
        memories: [memory],
        messages: buildTimeline(35),
      })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    const result = await useCase.execute({ conversationId: "conv-1", manual: true })

    expect(result.deleted).toBe(1)
    expect(deletedIds).toEqual(["m-old"])
  })

  it("verifica que el logger no se llame cuando no hay candidatas", async () => {
    const conversation = buildConversation({ memoryDecayMode: "off" })
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: () => logger,
    }
    const { memoryRepo, conversationRepo, messageRepo } = buildRepos({
      conversation,
      memories: [],
      messages: [],
    })

    const useCase = new DecayConversationMemoryUseCase(
      conversationRepo,
      memoryRepo,
      messageRepo,
      logger,
    )
    await useCase.execute({ conversationId: "conv-1" })

    expect(logger.info).not.toHaveBeenCalled()
  })
})
