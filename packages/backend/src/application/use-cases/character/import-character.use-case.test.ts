import { describe, it, expect, vi } from "vitest"

import type { CharacterExport } from "@workspace/shared/types/export"
import type { CharacterVersionDTO } from "@workspace/shared/types/character"
import { ImportCharacterUseCase } from "./import-character.use-case"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type {
  CharacterAssetRepository,
  CharacterAssetStorage,
} from "../../../domain/ports/character-asset.repository"
import type { CharacterAssetWriter } from "../../services/store-character-asset.service"

const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
])

const version: CharacterVersionDTO = {
  id: "old-ver-1",
  characterId: "old-char",
  name: "Lyra",
  subtitle: "Guardián",
  profileImageAssetId: "old-asset",
  description: "Una guardiana",
  instructions: null,
  greeting: "Hola",
  versionNumber: 1,
  createdAt: "2026-08-01T10:00:00.000Z",
  cards: [
    { id: "old-card", versionId: "old-ver-1", title: "Rasgo", content: "Valiente", position: 0, active: true },
  ],
}

const buildPayload = (overrides: Partial<CharacterExport> = {}): CharacterExport => ({
  schemaVersion: 1,
  kind: "character-export",
  exportedAt: "2026-08-12T10:00:00.000Z",
  character: {
    id: "old-char",
    name: "Lyra",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  definition: version,
  ...overrides,
})

const buildRepos = () => {
  const characterRepository: CharacterRepository = {
    createWithFirstVersion: vi.fn(async (c, v) => ({ character: c, version: v })),
    findById: async () => null,
    list: async () => [],
    update: async (c) => c,
    delete: async () => {},
    findVersionById: async () => null,
    findVersionsByCharacterId: async () => [],
    findMaxVersionNumber: async () => 0,
    saveVersion: vi.fn(async (v) => v),
    updateProfileImageAssetId: vi.fn(async () => {}),
  }
  const conversationRepository: ConversationRepository = {
    create: vi.fn(async (c) => c),
    findById: async () => null,
    findByIdWithMessages: async () => null,
    list: async () => [],
    update: async (c) => c,
    updateSettings: async () => ({} as never),
    clearProviderInstanceId: async () => {},
  }
  const messageRepository: MessageRepository = {
    create: vi.fn(async (m) => m),
    findByConversationId: async () => [],
    findById: async () => null,
    findLastByConversationId: async () => null,
    update: async (m) => m,
    deleteById: async () => {},
    deleteAfterPosition: async () => {},
    clearAlternatives: async () => {},
  }
  const memoryRepository: MemoryRepository = {
    findById: async () => null,
    findByConversationId: async () => [],
    create: vi.fn(async (m) => m),
    update: async (m) => m,
    deleteById: async () => {},
  }
  const summaryRepository: SummaryRepository = {
    findById: async () => null,
    findByConversationId: async () => [],
    findLatestByConversationId: async () => null,
    create: vi.fn(async (s) => s),
    update: async (s) => s,
    deleteById: async () => {},
    deleteByIds: async () => {},
  }
  const assetRepository: CharacterAssetRepository = {
    create: vi.fn(async () => {}),
    findById: async () => null,
    findByCharacterId: async () => [],
    deleteById: async () => {},
  }
  const assetStorage: CharacterAssetStorage = {
    write: vi.fn(async () => {}),
    read: async () => {
      throw new Error("not used")
    },
    delete: async () => {},
  }
  const storeCharacterAsset: CharacterAssetWriter = {
    store: vi.fn(async ({ characterId, mimeType, data, createdAt }) => {
      const extension = mimeType === "image/png" ? "png" : "jpg"
      const metadata = {
        id: "new-asset-id",
        characterId,
        mimeType,
        sizeBytes: data.length,
        extension,
        width: 1,
        height: 1,
        createdAt: createdAt ?? new Date(),
      }
      await assetStorage.write(characterId, metadata.id, extension, data)
      await assetRepository.create(metadata)
      return metadata
    }),
  }

  return {
    characterRepository,
    conversationRepository,
    messageRepository,
    memoryRepository,
    summaryRepository,
    assetRepository,
    assetStorage,
    storeCharacterAsset,
  }
}

const buildUseCase = (repos = buildRepos()) =>
  new ImportCharacterUseCase(
    repos.characterRepository,
    repos.conversationRepository,
    repos.messageRepository,
    repos.memoryRepository,
    repos.summaryRepository,
    repos.storeCharacterAsset,
  )

describe("ImportCharacterUseCase", () => {
  it("importa un round-trip completo con ids nuevos y remapeo", async () => {
    const repos = buildRepos()
    const payload = buildPayload({
      profileImage: {
        assetId: "old-asset",
        mimeType: "image/png",
        base64: pngBytes.toString("base64"),
      },
      conversations: [
        {
          id: "old-conv",
          title: "Chat",
          versionId: "old-ver-1",
          createdAt: "2026-08-03T10:00:00.000Z",
          updatedAt: "2026-08-04T10:00:00.000Z",
          settings: {
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
            memoryDecayMode: "manual",
            memoryDecayThreshold: 4,
            memoryDecayAgeThreshold: 40,
            memoryDecaySpeed: 5,
            customProfileImageAssetId: null,
          },
          messages: [
            {
              id: "old-msg-1",
              conversationId: "old-conv",
              role: "assistant",
              content: "Hola",
              position: 0,
              alternatives: ["Alt"],
              alternativesCursor: 0,
              createdAt: "2026-08-03T10:00:00.000Z",
              editedAt: null,
            },
            {
              id: "old-msg-2",
              conversationId: "old-conv",
              role: "user",
              content: "Hola!",
              position: 1,
              alternatives: [],
              alternativesCursor: 0,
              createdAt: "2026-08-03T10:01:00.000Z",
              editedAt: null,
            },
          ],
          memories: [
            {
              id: "old-mem",
              conversationId: "old-conv",
              actor: "Lyra",
              title: "Memoria",
              description: "Detalle",
              priority: 7,
              createdBy: "assistant",
              updatedBy: "system",
              createdAt: "2026-08-03T10:00:00.000Z",
              updatedAt: "2026-08-03T10:00:00.000Z",
            },
          ],
          summaries: [
            {
              id: "old-sum",
              conversationId: "old-conv",
              content: "Resumen",
              firstMessageId: "old-msg-1",
              lastMessageId: "old-msg-2",
              model: "gpt-4o-mini",
              provider: "openai-compatible",
              createdAt: "2026-08-03T10:02:00.000Z",
              editedAt: null,
            },
          ],
        },
      ],
    })

    const result = await buildUseCase(repos).execute({ payload })

    expect(result.id).not.toBe("old-char")
    expect(result.name).toBe("Lyra")
    expect(result.subtitle).toBe("Guardián")
    expect(result.versionNumber).toBe(1)
    expect(result.profileImageAssetId).toBeTruthy()

    expect(repos.characterRepository.createWithFirstVersion).toHaveBeenCalledTimes(1)
    const createdVersion = (repos.characterRepository.createWithFirstVersion as ReturnType<typeof vi.fn>)
      .mock.calls[0][1]
    expect(createdVersion.id).not.toBe("old-ver-1")
    expect(createdVersion.cards[0].versionId).toBe(createdVersion.id)
    expect(createdVersion.cards[0].id).not.toBe("old-card")

    expect(repos.assetRepository.create).toHaveBeenCalledTimes(1)
    expect(repos.assetStorage.write).toHaveBeenCalledTimes(1)
    expect(
      repos.characterRepository.updateProfileImageAssetId,
    ).toHaveBeenCalledWith(createdVersion.id, result.profileImageAssetId)

    expect(repos.conversationRepository.create).toHaveBeenCalledTimes(1)
    const createdConversation = (repos.conversationRepository.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0]
    expect(createdConversation.id).not.toBe("old-conv")
    expect(createdConversation.versionId).toBe(createdVersion.id)
    expect(createdConversation.model).toBe("gpt-4o-mini")
    expect(createdConversation.temperature).toBe(0.9)
    expect(createdConversation.memoryDecayMode).toBe("manual")
    expect(createdConversation.titleSource).toBe("manual")

    expect(repos.messageRepository.create).toHaveBeenCalledTimes(2)
    expect(repos.memoryRepository.create).toHaveBeenCalledTimes(1)
    const createdMemory = (repos.memoryRepository.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0]
    expect(createdMemory.conversationId).toBe(createdConversation.id)
    expect(createdMemory.title).toBe("Memoria")

    expect(repos.summaryRepository.create).toHaveBeenCalledTimes(1)
    const createdSummary = (repos.summaryRepository.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0]
    expect(createdSummary.firstMessageId).not.toBe("old-msg-1")
    expect(createdSummary.lastMessageId).not.toBe("old-msg-2")
    expect(createdSummary.firstMessageId).not.toBe(createdSummary.lastMessageId)
  })

  it("importa solo la definición (sin imagen ni conversaciones)", async () => {
    const repos = buildRepos()

    const result = await buildUseCase(repos).execute({ payload: buildPayload() })

    expect(result.profileImageAssetId).toBeNull()
    expect(repos.assetRepository.create).not.toHaveBeenCalled()
    expect(repos.conversationRepository.create).not.toHaveBeenCalled()
    expect(repos.characterRepository.createWithFirstVersion).toHaveBeenCalledTimes(1)
  })

  it("prefiere versions sobre definition y persiste todas", async () => {
    const repos = buildRepos()
    const payload = buildPayload({
      versions: [
        { ...version, id: "old-ver-1", versionNumber: 1 },
        { ...version, id: "old-ver-2", versionNumber: 2, description: "v2" },
      ],
    })

    const result = await buildUseCase(repos).execute({ payload })

    expect(result.versionNumber).toBe(2)
    expect(repos.characterRepository.createWithFirstVersion).toHaveBeenCalledTimes(1)
    expect(repos.characterRepository.saveVersion).toHaveBeenCalledTimes(1)
  })

  it("rechaza un kind inválido", async () => {
    const repos = buildRepos()
    const payload = buildPayload({ kind: "otra-cosa" })

    await expect(buildUseCase(repos).execute({ payload })).rejects.toThrow(
      "El archivo no es una exportación de personaje",
    )
    expect(repos.characterRepository.createWithFirstVersion).not.toHaveBeenCalled()
  })

  it("rechaza una schemaVersion no soportada", async () => {
    const repos = buildRepos()
    const payload = buildPayload({ schemaVersion: 99 })

    await expect(buildUseCase(repos).execute({ payload })).rejects.toThrow(
      "Versión de esquema no soportada",
    )
  })

  it("rechaza un archivo sin definición ni versiones", async () => {
    const repos = buildRepos()
    const payload = buildPayload({ definition: undefined, versions: undefined })

    await expect(buildUseCase(repos).execute({ payload })).rejects.toThrow(
      "El archivo no contiene la definición del personaje",
    )
  })
})
