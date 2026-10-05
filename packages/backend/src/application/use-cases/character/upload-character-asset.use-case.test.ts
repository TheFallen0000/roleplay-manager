import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { UploadCharacterAssetUseCase } from "./upload-character-asset.use-case"
import { FilesystemCharacterAssetStorage } from "../../../infrastructure/adapters/secondary/filesystem/filesystem-character-asset-storage"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import type { CharacterAssetImageProcessor } from "../../../domain/ports/character-asset-image-processor"
import { StoreCharacterAssetService } from "../../services/store-character-asset.service"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"

const now = new Date("2026-08-04T12:00:00Z")

const buildCharacter = () =>
  Character.create({ id: "char-1", name: "Test", createdAt: now, updatedAt: now })

const buildVersion = () =>
  CharacterVersion.create({
    id: "ver-1",
    characterId: "char-1",
    name: "Test",
    subtitle: null,
    profileImageAssetId: null,
    description: "desc",
    instructions: null,
    greeting: "hi",
    versionNumber: 1,
    createdAt: now,
    cards: [],
  })

describe("UploadCharacterAssetUseCase", () => {
  let tempDir: string
  let storage: FilesystemCharacterAssetStorage
  let uploadedAssets: any[]

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "upload-test-"))
    storage = new FilesystemCharacterAssetStorage(tempDir)
    uploadedAssets = []
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  const buildUseCase = (charRepo: CharacterRepository) => {
    const assetRepo: CharacterAssetRepository = {
      create: async (m) => { uploadedAssets.push(m) },
      findById: async () => null,
      findByCharacterId: async () => [],
      deleteById: async () => {},
    }
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
      assetRepo,
      storage,
      imageProcessor,
      3 * 1024 * 1024,
    )
    return new UploadCharacterAssetUseCase(charRepo, storeAsset)
  }

  it("uploads a valid PNG image", async () => {
    const charRepo: CharacterRepository = {
      createWithFirstVersion: async () => ({ character: buildCharacter(), version: buildVersion() }),
      findById: async () => ({ character: buildCharacter(), currentVersion: buildVersion() }),
      list: async () => [],
      update: async (c) => c,
      delete: async () => {},
      findVersionById: async () => null,
      findVersionsByCharacterId: async () => [],
      findMaxVersionNumber: async () => 0,
      saveVersion: async (v) => v,
      updateProfileImageAssetId: async () => {},
    }
    const useCase = buildUseCase(charRepo)

    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    const result = await useCase.execute({
      characterId: "char-1",
      mimeType: "image/png",
      sizeBytes: pngBytes.length,
      data: pngBytes,
    })

    expect(result.assetId).toBeTruthy()
    expect(result.characterId).toBe("char-1")
    expect(result.mimeType).toBe("image/png")
    expect(result.sizeBytes).toBe(10)
    expect(uploadedAssets).toHaveLength(1)
    expect(await storage.hasVariant("char-1", result.assetId, "thumbnail")).toBe(true)
  })

  it("rejects if character not found", async () => {
    const charRepo: CharacterRepository = {
      createWithFirstVersion: async () => ({ character: buildCharacter(), version: buildVersion() }),
      findById: async () => null,
      list: async () => [],
      update: async (c) => c,
      delete: async () => {},
      findVersionById: async () => null,
      findVersionsByCharacterId: async () => [],
      findMaxVersionNumber: async () => 0,
      saveVersion: async (v) => v,
      updateProfileImageAssetId: async () => {},
    }
    const useCase = buildUseCase(charRepo)

    await expect(
      useCase.execute({
        characterId: "nonexistent",
        mimeType: "image/png",
        sizeBytes: 10,
        data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
      }),
    ).rejects.toThrow("not found")
  })

  it("rejects oversized file", async () => {
    const charRepo: CharacterRepository = {
      createWithFirstVersion: async () => ({ character: buildCharacter(), version: buildVersion() }),
      findById: async () => ({ character: buildCharacter(), currentVersion: buildVersion() }),
      list: async () => [],
      update: async (c) => c,
      delete: async () => {},
      findVersionById: async () => null,
      findVersionsByCharacterId: async () => [],
      findMaxVersionNumber: async () => 0,
      saveVersion: async (v) => v,
      updateProfileImageAssetId: async () => {},
    }
    const assetRepo: CharacterAssetRepository = {
      create: async () => {},
      findById: async () => null,
      findByCharacterId: async () => [],
      deleteById: async () => {},
    }
    const imageProcessor: CharacterAssetImageProcessor = {
      process: async () => ({ width: 1, height: 1, variants: [] }),
    }
    const useCase = new UploadCharacterAssetUseCase(
      charRepo,
      new StoreCharacterAssetService(assetRepo, storage, imageProcessor, 100),
    )

    await expect(
      useCase.execute({
        characterId: "char-1",
        mimeType: "image/png",
        sizeBytes: 1000,
        data: Buffer.alloc(1000, 0x89),
      }),
    ).rejects.toThrow("too large")
  })

  it("rejects disallowed mime type", async () => {
    const charRepo: CharacterRepository = {
      createWithFirstVersion: async () => ({ character: buildCharacter(), version: buildVersion() }),
      findById: async () => ({ character: buildCharacter(), currentVersion: buildVersion() }),
      list: async () => [],
      update: async (c) => c,
      delete: async () => {},
      findVersionById: async () => null,
      findVersionsByCharacterId: async () => [],
      findMaxVersionNumber: async () => 0,
      saveVersion: async (v) => v,
      updateProfileImageAssetId: async () => {},
    }
    const useCase = buildUseCase(charRepo)

    await expect(
      useCase.execute({
        characterId: "char-1",
        mimeType: "image/svg+xml",
        sizeBytes: 10,
        data: Buffer.from("<svg></svg>"),
      }),
    ).rejects.toThrow("not allowed")
  })
})
