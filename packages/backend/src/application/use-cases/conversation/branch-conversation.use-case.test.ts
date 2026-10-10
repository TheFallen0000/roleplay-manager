import { describe, it, expect, vi } from "vitest"

import { BranchConversationUseCase } from "./branch-conversation.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Memory } from "../../../domain/entities/memory.entity"
import { Summary } from "../../../domain/entities/summary.entity"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"

const now = new Date("2026-08-12T10:00:00Z")

const character = Character.create({
  id: "char-1",
  name: "Lyra",
  createdAt: now,
  updatedAt: now,
})

const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  description: "A guard",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const origin = Conversation.create({
  id: "conv-1",
  versionId: "ver-1",
  title: "Origen",
  titleSource: "manual",
  model: "gpt-4o-mini",
  provider: "openai-compatible",
  providerInstanceId: "inst-1",
  recentMessageCount: 12,
  summaryFrequency: 25,
  temperature: 0.9,
  maxTokens: 4096,
  topP: 0.8,
  frequencyPenalty: 0.1,
  presencePenalty: 0.2,
  stopSequences: ["###"],
  memoryProposalMode: "manual",
  customProfileImageAssetId: "asset-9",
  backgroundImageAssetId: "asset-bg",
  backgroundFit: "contain",
  backgroundScrim: 25,
  messageStyle: "novel",
  characterDialogueColor: "#ec4899",
  userDialogueColor: "#0ea5e9",
  memoryDecayMode: "manual",
  memoryDecayThreshold: 4,
  memoryDecayAgeThreshold: 40,
  memoryDecaySpeed: 5,
  createdAt: now,
  updatedAt: now,
})

const buildMessage = (
  id: string,
  position: number,
  role: "user" | "assistant",
  content: string,
  alternatives: string[] = [],
): Message =>
  Message.create({
    id,
    conversationId: "conv-1",
    role,
    content,
    position,
    alternatives,
    alternativesCursor: 0,
    createdAt: new Date(now.getTime() + position),
    editedAt: null,
  })

const messages = [
  buildMessage("msg-0", 0, "assistant", "Hello!"),
  buildMessage("msg-1", 1, "user", "Hola"),
  buildMessage("msg-2", 2, "assistant", "Saludos viajero", ["Alt A", "Alt B"]),
  buildMessage("msg-3", 3, "user", "Adiós"),
]

const buildConversationRepo = (conversation: Conversation | null): ConversationRepository => ({
  create: async (c) => c,
  findById: async () => conversation,
  findByIdWithMessages: async () => null,
  list: async () => [],
  update: async (c) => c,
  updateSettings: async (_id, _s) => conversation ?? ({} as Conversation),
  clearProviderInstanceId: async () => {},
})

const buildMessageRepo = (): MessageRepository => ({
  create: vi.fn(async (m) => m),
  findById: async () => null,
  findByConversationId: async () => messages,
  findLastByConversationId: async () => null,
  update: async (m) => m,
  deleteById: async () => {},
  deleteAfterPosition: async () => {},
  clearAlternatives: async () => {},
})

const buildCharacterRepo = (): CharacterRepository => ({
  createWithFirstVersion: async () => ({ character, version }),
  findById: async () => ({ character, currentVersion: version }),
  list: async () => [],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async () => version,
  findVersionsByCharacterId: async () => [version],
  findMaxVersionNumber: async () => 1,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const buildAssetRepo = (): CharacterAssetRepository => ({
  create: async () => {},
  findById: async () => null,
  findByCharacterId: async () => [],
  deleteById: async () => {},
})

const originMemory = Memory.create({
  id: "mem-1",
  conversationId: "conv-1",
  actor: "Lyra",
  title: "Recuerda el norte",
  description: "Es guardiana del norte",
  priority: 7,
  createdBy: "assistant",
  updatedBy: "system",
  createdAt: new Date(now.getTime() + 1),
  updatedAt: new Date(now.getTime() + 2),
})

const buildMemoryRepo = (): MemoryRepository => ({
  findById: async () => null,
  findByConversationId: async () => [originMemory],
  create: vi.fn(async (m) => m),
  update: async (m) => m,
  deleteById: async () => {},
})

const originSummary = Summary.create({
  id: "sum-1",
  conversationId: "conv-1",
  content: "Hasta el saludo",
  firstMessageId: "msg-0",
  lastMessageId: "msg-2",
  model: "gpt-4o-mini",
  provider: "openai-compatible",
  createdAt: new Date(now.getTime() + 3),
  editedAt: null,
})

const buildSummaryRepo = (): SummaryRepository => ({
  findById: async () => null,
  findByConversationId: async () => [originSummary],
  findLatestByConversationId: async () => originSummary,
  create: vi.fn(async (s) => s),
  update: async (s) => s,
  deleteById: async () => {},
  deleteByIds: async () => {},
})

const buildUseCase = (conversation: Conversation | null = origin) =>
  new BranchConversationUseCase(
    buildConversationRepo(conversation),
    buildMessageRepo(),
    buildMemoryRepo(),
    buildSummaryRepo(),
    buildCharacterRepo(),
    buildAssetRepo(),
  )

describe("BranchConversationUseCase", () => {
  it("crea una rama copiando mensajes 0..target, memorias y resúmenes, y hereda la config", async () => {
    const messageRepo = buildMessageRepo()
    const memoryRepo = buildMemoryRepo()
    const summaryRepo = buildSummaryRepo()
    const useCase = new BranchConversationUseCase(
      buildConversationRepo(origin),
      messageRepo,
      memoryRepo,
      summaryRepo,
      buildCharacterRepo(),
      buildAssetRepo(),
    )

    const result = await useCase.execute({ conversationId: "conv-1", targetMessageId: "msg-2" })

    expect(result.id).not.toBe("conv-1")
    expect(result.title).toBeNull()
    expect(result.messages).toHaveLength(3)
    expect(result.messages.map((m) => m.position)).toEqual([0, 1, 2])
    expect(result.messages[2].content).toBe("Saludos viajero")
    expect(result.messages[2].alternatives).toEqual([])

    expect(memoryRepo.create).toHaveBeenCalledTimes(1)
    const createdMemory = (memoryRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(createdMemory.conversationId).toBe(result.id)
    expect(createdMemory.title).toBe("Recuerda el norte")
    expect(createdMemory.updatedAt).toBe(originMemory.updatedAt)

    expect(summaryRepo.create).toHaveBeenCalledTimes(1)
    const createdSummary = (summaryRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(createdSummary.conversationId).toBe(result.id)
    expect(createdSummary.content).toBe("Hasta el saludo")
    expect(createdSummary.firstMessageId).not.toBe("msg-0")
    expect(createdSummary.lastMessageId).not.toBe("msg-2")

    expect(result.model).toBe("gpt-4o-mini")
    expect(result.provider).toBe("openai-compatible")
    expect(result.providerInstanceId).toBe("inst-1")
    expect(result.recentMessageCount).toBe(12)
    expect(result.summaryFrequency).toBe(25)
    expect(result.temperature).toBe(0.9)
    expect(result.maxTokens).toBe(4096)
    expect(result.topP).toBe(0.8)
    expect(result.frequencyPenalty).toBe(0.1)
    expect(result.presencePenalty).toBe(0.2)
    expect(result.stopSequences).toEqual(["###"])
    expect(result.memoryProposalMode).toBe("manual")
    expect(result.customProfileImageAssetId).toBe("asset-9")
    expect(result.memoryDecayMode).toBe("manual")
    expect(result.memoryDecayThreshold).toBe(4)
    expect(result.memoryDecayAgeThreshold).toBe(40)
    expect(result.memoryDecaySpeed).toBe(5)
  })

  it("no copia resúmenes cuyo rango queda fuera de la rama", async () => {
    const summaryRepo = buildSummaryRepo()
    const useCase = new BranchConversationUseCase(
      buildConversationRepo(origin),
      buildMessageRepo(),
      buildMemoryRepo(),
      summaryRepo,
      buildCharacterRepo(),
      buildAssetRepo(),
    )

    await useCase.execute({ conversationId: "conv-1", targetMessageId: "msg-1" })

    expect(summaryRepo.create).not.toHaveBeenCalled()
  })

  it("persiste la conversación y cada mensaje copiado", async () => {
    const conversationCreate = vi.fn(async (c) => c)
    const repoWithSpy: ConversationRepository = { ...buildConversationRepo(origin), create: conversationCreate }
    const messageRepo = buildMessageRepo()

    const useCase = new BranchConversationUseCase(
      repoWithSpy,
      messageRepo,
      buildMemoryRepo(),
      buildSummaryRepo(),
      buildCharacterRepo(),
      buildAssetRepo(),
    )

    await useCase.execute({ conversationId: "conv-1", targetMessageId: "msg-1" })

    expect(conversationCreate).toHaveBeenCalledTimes(1)
    expect(messageRepo.create).toHaveBeenCalledTimes(2)

    const created = conversationCreate.mock.calls[0][0]
    expect(created.customProfileImageAssetId).toBe("asset-9")
    expect(created.backgroundImageAssetId).toBe("asset-bg")
    expect(created.backgroundFit).toBe("contain")
    expect(created.backgroundScrim).toBe(25)
    expect(created.messageStyle).toBe("novel")
    expect(created.characterDialogueColor).toBe("#ec4899")
    expect(created.userDialogueColor).toBe("#0ea5e9")
  })

  it("lanza ConversationNotFoundError si el origen no existe", async () => {
    const useCase = buildUseCase(null)

    await expect(
      useCase.execute({ conversationId: "missing", targetMessageId: "msg-1" }),
    ).rejects.toThrow("Conversation with id 'missing' not found.")
  })

  it("lanza MessageNotFoundError si el mensaje objetivo no existe", async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute({ conversationId: "conv-1", targetMessageId: "nope" }),
    ).rejects.toThrow("Message with id 'nope' not found.")
  })

  it("rechaza crear rama desde el primer mensaje", async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute({ conversationId: "conv-1", targetMessageId: "msg-0" }),
    ).rejects.toThrow("Cannot create a branch from the first message.")
  })
})
