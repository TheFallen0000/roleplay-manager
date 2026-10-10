import { describe, it, expect } from "vitest"

import { UpdateConversationSettingsUseCase } from "./update-conversation-settings.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import type { CharacterAssetRepository, CharacterAssetStorage } from "../../../domain/ports/character-asset.repository"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import type { PlayerCharacter } from "../../../domain/entities/player-character.entity"
import type { CharacterAssetMetadata } from "../../../domain/ports/character-asset.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"

const playerCharacterRepository = {
  findById: async (id: string) =>
    id === "pc-1"
      ? ({
          id: "pc-1",
          name: "Alice",
          description: "Exploradora",
        } as unknown as PlayerCharacter)
      : null,
  list: async () => [],
  create: async (pc: unknown) => pc,
  update: async (pc: unknown) => pc,
  delete: async () => {},
} as unknown as PlayerCharacterRepository

const now = new Date()
const character = Character.create({ id: "char-1", name: "Test", createdAt: now, updatedAt: now })
const version = CharacterVersion.create({
  id: "ver-1", characterId: "char-1", name: "Test",
  subtitle: null, profileImageAssetId: null,
  description: "A test character", instructions: null,
  greeting: "Hello!", versionNumber: 1, createdAt: now, cards: [],
})

const existingConv = Conversation.create({
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

let capturedSettings: Record<string, unknown> = {}

const buildConversationRepo = (
  conversation: Conversation,
  others: Conversation[] = [],
): ConversationRepository => ({
  create: async (c) => c,
  findById: async () => conversation,
  findByIdWithMessages: async () => null,
  list: async () => others,
  update: async (c) => c,
  updateSettings: async (_id: string, settings: any) => {
    capturedSettings = settings
    return conversation
  },
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

const buildProviderRegistry = (): ProviderRegistry => ({
  getAdapter: async () => null,
  createAdapter: () => {
    throw new Error("not implemented")
  },
  listRegistered: () => [],
})

const buildProviderInstanceRepo = (): ProviderInstanceRepository => ({
  create: async () => ({
    id: "inst-1",
    providerId: "openai-compatible" as const,
    name: "Test",
    kind: "openai-compatible",
    baseUrl: "https://example.com",
    url: "https://example.com",
    apiKey: null,
    hasApiKey: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }),
  findById: async () => null,
  list: async () => [],
  delete: async () => {},
  update: async (_id, _input) => ({
    id: "inst-1",
    providerId: "openai-compatible" as const,
    name: "Test",
    kind: "openai-compatible",
    baseUrl: "https://example.com",
    url: "https://example.com",
    apiKey: null,
    hasApiKey: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }),
})

const buildLogger = (): Logger => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => buildLogger(),
})

let deletedAssetIds: string[] = []

const buildAssetRepo = (): CharacterAssetRepository => ({
  create: async () => {},
  findById: async (id: string): Promise<CharacterAssetMetadata | null> => {
    if (id === "asset-1" || id === "asset-2") {
      return {
        id,
        characterId: "char-1",
        mimeType: "image/png",
        sizeBytes: 10,
        extension: "png",
        width: 1,
        height: 1,
        createdAt: now,
      }
    }
    return null
  },
  findByCharacterId: async () => [],
  deleteById: async (id) => { deletedAssetIds.push(id) },
})

const buildAssetStorage = (): CharacterAssetStorage => ({
  write: async () => {},
  read: async () => {
    throw new Error("not implemented")
  },
  delete: async () => {},
})

function buildUseCase(
  conv: Conversation = existingConv,
  others: Conversation[] = [],
) {
  capturedSettings = {}
  deletedAssetIds = []
  return new UpdateConversationSettingsUseCase(
    buildConversationRepo(conv, others),
    buildCharacterRepo(),
    buildProviderRegistry(),
    buildProviderInstanceRepo(),
    buildLogger(),
    buildAssetRepo(),
    buildAssetStorage(),
    playerCharacterRepository,
  )
}

describe("UpdateConversationSettingsUseCase", () => {
  it("capa recentMessageCount cuando ambos campos violan el invariante", async () => {
    const useCase = buildUseCase()
    await useCase.execute("conv-1", {
      recentMessageCount: 20,
      summaryFrequency: 15,
    })
    expect(capturedSettings.recentMessageCount).toBe(14)
    expect(capturedSettings.summaryFrequency).toBe(15)
  })

  it("capa recentMessageCount contra summaryFrequency actual cuando solo viene recent", async () => {
    const useCase = buildUseCase()
    await useCase.execute("conv-1", {
      recentMessageCount: 30,
    })
    expect(capturedSettings.recentMessageCount).toBe(19)
    expect(capturedSettings.summaryFrequency).toBeUndefined()
  })

  it("no modifica valores válidos", async () => {
    const useCase = buildUseCase()
    await useCase.execute("conv-1", {
      recentMessageCount: 5,
      summaryFrequency: 25,
    })
    expect(capturedSettings.recentMessageCount).toBe(5)
    expect(capturedSettings.summaryFrequency).toBe(25)
  })

  it("no modifica recentMessageCount cuando solo cambia summaryFrequency", async () => {
    const useCase = buildUseCase()
    await useCase.execute("conv-1", {
      summaryFrequency: 30,
    })
    expect(capturedSettings.recentMessageCount).toBeUndefined()
    expect(capturedSettings.summaryFrequency).toBe(30)
  })

  it("acepta customProfileImageAssetId y no borra assets previos cuando no hay override", async () => {
    const useCase = buildUseCase()
    const result = await useCase.execute("conv-1", {
      customProfileImageAssetId: "asset-1",
    })
    expect(capturedSettings.customProfileImageAssetId).toBe("asset-1")
    expect(deletedAssetIds).toEqual([])
    expect(result.customProfileImageAssetId).toBeNull()
  })

  it("borra el override anterior al reemplazarlo", async () => {
    const conv = existingConv.withCustomProfileImageAssetId("asset-1")
    const useCase = buildUseCase(conv)
    await useCase.execute("conv-1", {
      customProfileImageAssetId: "asset-2",
    })
    expect(deletedAssetIds).toEqual(["asset-1"])
  })

  it("borra el override anterior al limpiarlo", async () => {
    const conv = existingConv.withCustomProfileImageAssetId("asset-1")
    const useCase = buildUseCase(conv)
    await useCase.execute("conv-1", {
      customProfileImageAssetId: null,
    })
    expect(deletedAssetIds).toEqual(["asset-1"])
  })

  it("no borra nada al reenviar el mismo override", async () => {
    const conv = existingConv.withCustomProfileImageAssetId("asset-1")
    const useCase = buildUseCase(conv)
    await useCase.execute("conv-1", {
      customProfileImageAssetId: "asset-1",
    })
    expect(deletedAssetIds).toEqual([])
  })

  it("rechaza un asset inexistente", async () => {
    const useCase = buildUseCase()
    await expect(
      useCase.execute("conv-1", { customProfileImageAssetId: "missing" }),
    ).rejects.toThrow("not found")
    expect(deletedAssetIds).toEqual([])
  })

  it("persiste la persona elegida", async () => {
    const useCase = buildUseCase()

    await useCase.execute("conv-1", { playerCharacterId: "pc-1" })

    expect(capturedSettings.playerCharacterId).toBe("pc-1")
  })

  it("permite limpiar la persona", async () => {
    const useCase = buildUseCase()

    await useCase.execute("conv-1", { playerCharacterId: null })

    expect(capturedSettings.playerCharacterId).toBeNull()
  })

  it("rechaza una persona inexistente", async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute("conv-1", { playerCharacterId: "missing" }),
    ).rejects.toThrow("Player character with id 'missing' not found.")
    expect(capturedSettings.playerCharacterId).toBeUndefined()
  })

  it("acepta fondo, ajuste y capa el velo", async () => {
    const useCase = buildUseCase()

    await useCase.execute("conv-1", {
      backgroundImageAssetId: "asset-1",
      backgroundFit: "contain",
      backgroundScrim: 150,
    })

    expect(capturedSettings.backgroundImageAssetId).toBe("asset-1")
    expect(capturedSettings.backgroundFit).toBe("contain")
    expect(capturedSettings.backgroundScrim).toBe(100)
  })

  it("capa un velo negativo a 0", async () => {
    const useCase = buildUseCase()

    await useCase.execute("conv-1", { backgroundScrim: -20 })

    expect(capturedSettings.backgroundScrim).toBe(0)
  })

  it("rechaza un fondo inexistente", async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute("conv-1", { backgroundImageAssetId: "missing" }),
    ).rejects.toThrow("not found")
    expect(deletedAssetIds).toEqual([])
  })

  it("borra el fondo anterior al reemplazarlo si nadie más lo usa", async () => {
    const conv = existingConv.withBackgroundImageAssetId("asset-1")
    const useCase = buildUseCase(conv)

    await useCase.execute("conv-1", { backgroundImageAssetId: "asset-2" })

    expect(deletedAssetIds).toEqual(["asset-1"])
  })

  it("no borra el fondo anterior si otra conversación lo comparte", async () => {
    const conv = existingConv.withBackgroundImageAssetId("asset-1")
    const branch = {
      backgroundImageAssetId: "asset-1",
      customProfileImageAssetId: null,
    } as unknown as Conversation
    const useCase = buildUseCase(conv, [branch])

    await useCase.execute("conv-1", { backgroundImageAssetId: null })

    expect(deletedAssetIds).toEqual([])
  })

  it("no borra la imagen personalizada si otra rama la comparte", async () => {
    const conv = existingConv.withCustomProfileImageAssetId("asset-1")
    const branch = {
      customProfileImageAssetId: "asset-1",
      backgroundImageAssetId: null,
    } as unknown as Conversation
    const useCase = buildUseCase(conv, [branch])

    await useCase.execute("conv-1", { customProfileImageAssetId: null })

    expect(deletedAssetIds).toEqual([])
  })

  it("acepta y guarda el estilo de mensaje y los colores de diálogo", async () => {
    const useCase = buildUseCase()

    await useCase.execute("conv-1", {
      messageStyle: "document",
      characterDialogueColor: "#7c3aed",
      userDialogueColor: null,
    })

    expect(capturedSettings.messageStyle).toBe("document")
    expect(capturedSettings.characterDialogueColor).toBe("#7c3aed")
    expect(capturedSettings.userDialogueColor).toBeNull()
  })

  it("rechaza un estilo de mensaje desconocido", async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute("conv-1", { messageStyle: "fancy" as never }),
    ).rejects.toThrow("Invalid message style")
  })

  it("rechaza un color de diálogo que no sea #RRGGBB", async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute("conv-1", { characterDialogueColor: "violet" }),
    ).rejects.toThrow("dialogue colour")
  })
})
