import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { UploadConversationCustomImageUseCase } from "./upload-conversation-custom-image.use-case"
import { FilesystemCharacterAssetStorage } from "../../../infrastructure/adapters/secondary/filesystem/filesystem-character-asset-storage"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import type { CharacterAssetImageProcessor } from "../../../domain/ports/character-asset-image-processor"
import { StoreCharacterAssetService } from "../../services/store-character-asset.service"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"

const now = new Date("2026-08-06T12:00:00Z")

const character = Character.create({ id: "char-1", name: "Test", createdAt: now, updatedAt: now })
const version = CharacterVersion.create({
  id: "ver-1", characterId: "char-1", name: "Test",
  subtitle: null, profileImageAssetId: null,
  description: "A test character", instructions: null,
  greeting: "Hello!", versionNumber: 1, createdAt: now, cards: [],
})

const buildConversation = () =>
  Conversation.create({
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

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

describe("UploadConversationCustomImageUseCase", () => {
  let tempDir: string
  let storage: FilesystemCharacterAssetStorage
  let uploadedAssets: any[]

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "conv-upload-test-"))
    storage = new FilesystemCharacterAssetStorage(tempDir)
    uploadedAssets = []
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  const buildConversationRepo = (conversation: Conversation | null): ConversationRepository => ({
    create: async (c) => c,
    findById: async () => conversation,
    findByIdWithMessages: async () => null,
    list: async () => [],
    update: async (c) => c,
    updateSettings: async (_id, settings) => {
      throw new Error(`updateSettings not expected: ${JSON.stringify(settings)}`)
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

  const buildAssetRepo = (): CharacterAssetRepository => ({
    create: async (m) => { uploadedAssets.push(m) },
    findById: async () => null,
    findByCharacterId: async () => [],
    deleteById: async () => {},
  })

  const buildUseCase = (conversation: Conversation | null = buildConversation()) => {
    const imageProcessor: CharacterAssetImageProcessor = {
      process: async () => ({
        width: 1,
        height: 1,
        variants: [
          {
            variant: "thumbnail",
            width: 1,
            height: 1,
            data: Buffer.from("webp-variant"),
          },
        ],
      }),
    }
    const storeAsset = new StoreCharacterAssetService(
      buildAssetRepo(),
      storage,
      imageProcessor,
      3 * 1024 * 1024,
    )
    return new UploadConversationCustomImageUseCase(
      buildConversationRepo(conversation),
      buildCharacterRepo(),
      storeAsset,
    )
  }

  it("uploads a valid PNG and stores it under the character", async () => {
    const useCase = buildUseCase()

    const result = await useCase.execute({
      conversationId: "conv-1",
      mimeType: "image/png",
      sizeBytes: pngBytes.length,
      data: pngBytes,
    })

    expect(result.assetId).toBeTruthy()
    expect(result.characterId).toBe("char-1")
    expect(result.mimeType).toBe("image/png")
    expect(result.sizeBytes).toBe(10)
    expect(uploadedAssets).toHaveLength(1)
  })

  it("rejects when the conversation does not exist", async () => {
    const useCase = buildUseCase(null)

    await expect(
      useCase.execute({
        conversationId: "missing",
        mimeType: "image/png",
        sizeBytes: 10,
        data: pngBytes,
      }),
    ).rejects.toThrow("not found")
  })

  it("rejects oversized files", async () => {
    const imageProcessor: CharacterAssetImageProcessor = {
      process: async () => ({ width: 1, height: 1, variants: [] }),
    }
    const useCase = new UploadConversationCustomImageUseCase(
      buildConversationRepo(buildConversation()),
      buildCharacterRepo(),
      new StoreCharacterAssetService(
        buildAssetRepo(),
        storage,
        imageProcessor,
        100,
      ),
    )

    await expect(
      useCase.execute({
        conversationId: "conv-1",
        mimeType: "image/png",
        sizeBytes: 1000,
        data: Buffer.alloc(1000, 0x89),
      }),
    ).rejects.toThrow("too large")
  })

  it("rejects disallowed mime types", async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute({
        conversationId: "conv-1",
        mimeType: "image/svg+xml",
        sizeBytes: 10,
        data: Buffer.from("<svg></svg>"),
      }),
    ).rejects.toThrow("not allowed")
  })
})
