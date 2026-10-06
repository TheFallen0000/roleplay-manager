import { Readable } from "node:stream"
import { describe, it, expect } from "vitest"

import { ExportCharacterUseCase } from "./export-character.use-case"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type {
  CharacterAssetRepository,
  CharacterAssetStorage,
} from "../../../domain/ports/character-asset.repository"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Memory } from "../../../domain/entities/memory.entity"
import { Summary } from "../../../domain/entities/summary.entity"

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
  subtitle: "Guardián",
  profileImageAssetId: "asset-1",
  description: "Una guardiana",
  instructions: null,
  greeting: "Hola",
  versionNumber: 2,
  createdAt: now,
  cards: [],
})

const otherVersion = CharacterVersion.create({
  id: "ver-other",
  characterId: "char-2",
  name: "Otro",
  subtitle: null,
  profileImageAssetId: null,
  description: "Otro",
  instructions: null,
  greeting: "Hey",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const conversationProps = {
  id: "conv-1",
  versionId: "ver-1",
  title: "Chat principal",
  titleSource: "manual" as const,
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
  memoryProposalMode: "manual" as const,
  customProfileImageAssetId: "asset-9",
  memoryDecayMode: "manual" as const,
  memoryDecayThreshold: 4,
  memoryDecayAgeThreshold: 40,
  memoryDecaySpeed: 5,
  createdAt: now,
  updatedAt: new Date(now.getTime() + 1000),
}

const conversation = Conversation.create(conversationProps)

const otherCharacterConversation = Conversation.create({
  id: "conv-2",
  versionId: "ver-other",
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

const message = Message.create({
  id: "msg-1",
  conversationId: "conv-1",
  role: "assistant",
  content: "Hola",
  position: 0,
  alternatives: [],
  alternativesCursor: 0,
  createdAt: now,
  editedAt: null,
})

const memory = Memory.create({
  id: "mem-1",
  conversationId: "conv-1",
  actor: "Lyra",
  title: "Memoria",
  description: "Detalle",
  priority: 7,
  createdBy: "assistant",
  updatedBy: "system",
  createdAt: now,
  updatedAt: now,
})

const summary = Summary.create({
  id: "sum-1",
  conversationId: "conv-1",
  content: "Resumen",
  firstMessageId: "msg-1",
  lastMessageId: "msg-1",
  model: "gpt-4o-mini",
  provider: "openai-compatible",
  createdAt: now,
  editedAt: null,
})

const buildCharacterRepo = (): CharacterRepository => ({
  createWithFirstVersion: async () => ({ character, version }),
  findById: async () => ({ character, currentVersion: version }),
  list: async () => [character],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async (id) =>
    id === "ver-1" ? version : id === "ver-other" ? otherVersion : null,
  findVersionsByCharacterId: async () => [version],
  findMaxVersionNumber: async () => 2,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const buildConversationRepo = (
  list: Conversation[] = [conversation, otherCharacterConversation],
): ConversationRepository => ({
  create: async (c) => c,
  findById: async () => conversation,
  findByIdWithMessages: async () => null,
  list: async () => list,
  update: async (c) => c,
  updateSettings: async () => conversation,
  clearProviderInstanceId: async () => {},
})

const buildMessageRepo = (): MessageRepository => ({
  create: async (m) => m,
  findByConversationId: async () => [message],
  findById: async () => message,
  findLastByConversationId: async () => message,
  update: async (m) => m,
  deleteById: async () => {},
  deleteAfterPosition: async () => {},
  clearAlternatives: async () => {},
})

const buildMemoryRepo = (): MemoryRepository => ({
  findById: async () => memory,
  findByConversationId: async () => [memory],
  create: async (m) => m,
  update: async (m) => m,
  deleteById: async () => {},
})

const buildSummaryRepo = (): SummaryRepository => ({
  findById: async () => summary,
  findByConversationId: async () => [summary],
  findLatestByConversationId: async () => summary,
  create: async (s) => s,
  update: async (s) => s,
  deleteById: async () => {},
  deleteByIds: async () => {},
})

const buildAssetRepo = (): CharacterAssetRepository => ({
  create: async () => {},
  findById: async (id) => ({
    id,
    characterId: "char-1",
    mimeType: "image/png",
    sizeBytes: 11,
    extension: "png",
    width: 1,
    height: 1,
    createdAt: now,
  }),
  findByCharacterId: async () => [],
  deleteById: async () => {},
})

const buildAssetStorage = (): CharacterAssetStorage => ({
  write: async () => {},
  read: async () => Readable.from([Buffer.from("image-bytes")]),
  delete: async () => {},
})

const buildUseCase = (
  conversationRepo: ConversationRepository = buildConversationRepo(),
) =>
  new ExportCharacterUseCase(
    buildCharacterRepo(),
    conversationRepo,
    buildMessageRepo(),
    buildMemoryRepo(),
    buildSummaryRepo(),
    buildAssetRepo(),
    buildAssetStorage(),
  )

describe("ExportCharacterUseCase", () => {
  it("exporta todas las secciones con la jerarquía y datos del personaje", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      sections: [
        "definition",
        "profileImage",
        "versions",
        "conversations",
        "conversations.messages",
        "conversations.memories",
        "conversations.summaries",
        "conversations.settings",
        "conversations.images",
        "standaloneSettings",
      ],
    })

    expect(result.schemaVersion).toBe(1)
    expect(result.kind).toBe("character-export")
    expect(result.character.name).toBe("Lyra")
    expect(result.definition?.versionNumber).toBe(2)
    expect(result.versions).toHaveLength(1)
    expect(result.profileImage?.assetId).toBe("asset-1")
    expect(result.profileImage?.base64).toBe(
      Buffer.from("image-bytes").toString("base64"),
    )

    expect(result.conversations).toHaveLength(1)
    const exported = result.conversations?.[0]
    expect(exported?.id).toBe("conv-1")
    expect(exported?.messages).toHaveLength(1)
    expect(exported?.memories).toHaveLength(1)
    expect(exported?.summaries).toHaveLength(1)
    expect(exported?.settings?.model).toBe("gpt-4o-mini")
    expect(exported?.settings?.memoryDecayMode).toBe("manual")
    expect(exported?.customProfileImageAssetId).toBe("asset-9")
    expect(exported?.backgroundImageAssetId).toBeNull()

    expect(result.conversationImages).toHaveLength(1)
    expect(result.conversationImages?.[0].assetId).toBe("asset-9")
    expect(result.conversationImages?.[0].base64).toBe(
      Buffer.from("image-bytes").toString("base64"),
    )

    expect(result.standaloneSettings?.temperature).toBe(0.9)
    expect(result.standaloneSettings?.memoryDecayThreshold).toBe(4)
    expect(
      Object.prototype.hasOwnProperty.call(
        result.standaloneSettings ?? {},
        "customProfileImageAssetId",
      ),
    ).toBe(false)
  })

  it("deduplica imágenes compartidas entre ramas y exporta ajuste y velo", async () => {
    const branch = Conversation.create({
      ...conversationProps,
      id: "conv-branch",
      customProfileImageAssetId: null,
      backgroundImageAssetId: "asset-9",
      backgroundFit: "contain",
      backgroundScrim: 30,
    })
    const result = await buildUseCase(
      buildConversationRepo([conversation, branch]),
    ).execute({
      characterId: "char-1",
      sections: ["conversations", "conversations.images"],
    })

    expect(result.conversations).toHaveLength(2)
    // The asset shared by both conversations travels exactly once.
    expect(result.conversationImages).toHaveLength(1)
    expect(result.conversationImages?.[0].assetId).toBe("asset-9")

    const exportedBranch = result.conversations?.find(
      (item) => item.id === "conv-branch",
    )
    expect(exportedBranch?.backgroundImageAssetId).toBe("asset-9")
    expect(exportedBranch?.backgroundFit).toBe("contain")
    expect(exportedBranch?.backgroundScrim).toBe(30)
  })

  it("no exporta imágenes de conversación si la sección no está seleccionada", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      sections: ["conversations", "conversations.settings"],
    })

    expect(result.conversationImages).toBeUndefined()
    expect(result.conversations?.[0].customProfileImageAssetId).toBeUndefined()
    expect(
      result.conversations?.[0].settings?.customProfileImageAssetId,
    ).toBeUndefined()
  })

  it("permite exportar solo la configuración standalone (plantilla)", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      sections: ["standaloneSettings"],
    })

    expect(result.definition).toBeUndefined()
    expect(result.versions).toBeUndefined()
    expect(result.profileImage).toBeUndefined()
    expect(result.conversations).toBeUndefined()
    expect(result.standaloneSettings?.model).toBe("gpt-4o-mini")
  })

  it("omite la base64 de la imagen cuando includeProfileImageBase64 es false", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      sections: ["profileImage"],
      includeProfileImageBase64: false,
    })

    expect(result.profileImage?.assetId).toBe("asset-1")
    expect(result.profileImage?.mimeType).toBe("image/png")
    expect(result.profileImage?.base64).toBeUndefined()
  })

  it("usa los valores por defecto si no hay conversaciones para standaloneSettings", async () => {
    const useCase = new ExportCharacterUseCase(
      buildCharacterRepo(),
      { ...buildConversationRepo(), list: async () => [otherCharacterConversation] },
      buildMessageRepo(),
      buildMemoryRepo(),
      buildSummaryRepo(),
      buildAssetRepo(),
      buildAssetStorage(),
    )

    const result = await useCase.execute({
      characterId: "char-1",
      sections: ["standaloneSettings"],
    })

    expect(result.standaloneSettings?.temperature).toBe(0.7)
    expect(result.standaloneSettings?.memoryDecayMode).toBe("silent")
  })

  it("rechaza secciones hijas sin su padre", async () => {
    await expect(
      buildUseCase().execute({
        characterId: "char-1",
        sections: ["conversations.memories"],
      }),
    ).rejects.toThrow("Export section 'conversations.memories' requires 'conversations'.")
  })

  it("lanza CharacterNotFoundError si el personaje no existe", async () => {
    const useCase = new ExportCharacterUseCase(
      { ...buildCharacterRepo(), findById: async () => null },
      buildConversationRepo(),
      buildMessageRepo(),
      buildMemoryRepo(),
      buildSummaryRepo(),
      buildAssetRepo(),
      buildAssetStorage(),
    )

    await expect(
      useCase.execute({ characterId: "missing", sections: ["definition"] }),
    ).rejects.toThrow("Character with id 'missing' not found.")
  })
})
