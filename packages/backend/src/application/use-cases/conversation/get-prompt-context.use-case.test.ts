import { describe, it, expect } from "vitest"

import { GetPromptContextUseCase } from "./get-prompt-context.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { Summary } from "../../../domain/entities/summary.entity"
import { Memory } from "../../../domain/entities/memory.entity"

const playerCharacterRepository = {
  findById: async () => null,
  list: async () => [],
  create: async (pc: unknown) => pc,
  update: async (pc: unknown) => pc,
  delete: async () => {},
} as unknown as PlayerCharacterRepository

const now = new Date()
const character = Character.create({ id: "char-1", name: "TestChar", createdAt: now, updatedAt: now })
const version = CharacterVersion.create({
  id: "ver-1", characterId: "char-1", name: "TestChar",
  subtitle: null,   profileImageAssetId: null,
  description: "A test character", instructions: null,
  greeting: "Hello!", versionNumber: 3, createdAt: now, cards: [],
})

const activeConv = Conversation.create({
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

const buildMessages = (count: number): Message[] =>
  Array.from({ length: count }, (_, i) =>
    Message.create({
      id: `msg-${i}`,
      conversationId: "conv-1",
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
      position: i,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: now,
      editedAt: null,
    }),
  )

const buildMemory = (): Memory =>
  Memory.reconstruct({
    id: "mem-1", conversationId: "conv-1",
    actor: "TestChar", title: "Test memory", description: "A memory",
    priority: 5, createdBy: "assistant", updatedBy: "system",
    createdAt: now, updatedAt: now,
  })

const buildSummary = (): Summary =>
  Summary.reconstruct({
    id: "sum-1", conversationId: "conv-1",
    content: "A summary of the conversation.",
    firstMessageId: "msg-0", lastMessageId: "msg-5",
    model: "test-model", provider: "ollama",
    createdAt: now, editedAt: null,
  })

let _capturedBuildParams: Record<string, unknown> = {}

const buildConversationRepo = (conv: Conversation, nonexistentIds: string[] = []): ConversationRepository => ({
  create: async (c) => c,
  findById: async (id) => (nonexistentIds.includes(id) ? null : conv),
  findByIdWithMessages: async () => null,
  list: async () => [],
  update: async (c) => c,
  updateSettings: async (_id, _s) => conv,
  clearProviderInstanceId: async () => {},
})

const buildCharacterRepo = (): CharacterRepository => ({
  createWithFirstVersion: async () => ({ character, version }),
  findById: async () => ({ character, currentVersion: version }),
  list: async () => [],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async () => version,
  findVersionsByCharacterId: async () => [],
  findMaxVersionNumber: async () => 0,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const buildMessageRepo = (messages: Message[]): MessageRepository => ({
  create: async (m) => m,
  findByConversationId: async () => messages,
  findById: async () => null,
  findLastByConversationId: async () => null,
  update: async (m) => m,
  deleteById: async () => {},
  deleteAfterPosition: async () => {},
  clearAlternatives: async () => {},
})

const buildMemoryRepo = (memories: Memory[]): MemoryRepository => ({
  findById: async () => null,
  findByConversationId: async () => memories,
  create: async (m) => m,
  update: async (m) => m,
  deleteById: async () => {},
})

const buildSummaryRepo = (summary: Summary | null): SummaryRepository => ({
  findById: async () => summary,
  findByConversationId: async () => summary ? [summary] : [],
  findLatestByConversationId: async () => summary,
  create: async (s) => s,
  update: async (s) => s,
  deleteById: async () => {},
  deleteByIds: async () => {},
})

const buildPromptContextBuilder = (): PromptContextBuilder => ({
  build: async (params) => {
    _capturedBuildParams = params as unknown as Record<string, unknown>
    return {
      systemPrompt: `Eres TestChar. A test character.\n\n## Personalidad\nNombre: TestChar`,
      messages: (params.messages ?? []).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    }
  },
})

function buildUseCase(params: {
  conv?: Conversation
  nonexistentIds?: string[]
  messages?: Message[]
  memories?: Memory[]
  summary?: Summary | null
}) {
  _capturedBuildParams = {}
  return new GetPromptContextUseCase(
    buildConversationRepo(params.conv ?? activeConv, params.nonexistentIds ?? []),
    buildCharacterRepo(),
    buildMessageRepo(params.messages ?? buildMessages(12)),
    buildMemoryRepo(params.memories ?? []),
    buildSummaryRepo(params.summary ?? null),
    buildPromptContextBuilder(),
    playerCharacterRepository,
  )
}

describe("GetPromptContextUseCase", () => {
  it("construye contexto con system prompt y mensajes recientes", async () => {
    const useCase = buildUseCase({})
    const result = await useCase.execute("conv-1")
    expect(result.systemPrompt).toContain("TestChar")
    expect(result.messages).toHaveLength(10)
    expect(result.messages[0].role).toBe("user")
    expect(result.messages[0].content).toBe("Message 2")
    expect(result.messages[9].role).toBe("assistant")
    expect(result.messages[9].content).toBe("Message 11")
  })

  it("incluye pendingMessage como último user message", async () => {
    const useCase = buildUseCase({})
    const result = await useCase.execute("conv-1", "Hola, esto es un mensaje pendiente")
    expect(result.messages).toHaveLength(11)
    expect(result.messages[10].role).toBe("user")
    expect(result.messages[10].content).toBe("Hola, esto es un mensaje pendiente")
  })

  it("incluye summary en metadata cuando existe", async () => {
    const summary = buildSummary()
    const useCase = buildUseCase({ summary })
    const result = await useCase.execute("conv-1")
    expect(result.metadata.summaryId).toBe("sum-1")
  })

  it("summaryId es null cuando no hay summary", async () => {
    const useCase = buildUseCase({ summary: null })
    const result = await useCase.execute("conv-1")
    expect(result.metadata.summaryId).toBeNull()
  })

  it("incluye metadata correcta", async () => {
    const memories = [buildMemory()]
    const useCase = buildUseCase({ memories })
    const result = await useCase.execute("conv-1")
    expect(result.metadata.characterName).toBe("TestChar")
    expect(result.metadata.characterVersion).toBe(3)
    expect(result.metadata.memoryCount).toBe(1)
    expect(result.metadata.recentMessageCount).toBe(10)
    expect(result.metadata.totalContextMessages).toBe(10)
    expect(result.metadata.totalCharacters).toBeGreaterThan(0)
  })

  it("lanza ConversationNotFoundError si no existe", async () => {
    const useCase = buildUseCase({ nonexistentIds: ["nonexistent"] })
    await expect(useCase.execute("nonexistent")).rejects.toThrow("Conversation with id 'nonexistent' not found.")
  })
})
