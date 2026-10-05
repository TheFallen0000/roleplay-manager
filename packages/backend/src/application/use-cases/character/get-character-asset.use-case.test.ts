import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { GetCharacterAssetUseCase } from "./get-character-asset.use-case"
import { FilesystemCharacterAssetStorage } from "../../../infrastructure/adapters/secondary/filesystem/filesystem-character-asset-storage"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"

describe("GetCharacterAssetUseCase", () => {
  let tempDir: string
  let storage: FilesystemCharacterAssetStorage

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "get-asset-test-"))
    storage = new FilesystemCharacterAssetStorage(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it("returns the asset stream and metadata", async () => {
    const assetDir = join(tempDir, "char-1")
    await import("node:fs/promises").then((fs) => fs.mkdir(assetDir, { recursive: true }))
    await writeFile(join(assetDir, "asset-1.png"), "image data")

    const assetRepo: CharacterAssetRepository = {
      create: async () => {},
      findById: async (id) => {
        if (id === "asset-1") {
          return {
            id: "asset-1",
            characterId: "char-1",
            mimeType: "image/png",
            sizeBytes: 10,
            extension: "png",
            width: 1,
            height: 1,
            createdAt: new Date(),
          }
        }
        return null
      },
      findByCharacterId: async () => [],
      deleteById: async () => {},
    }

    const useCase = new GetCharacterAssetUseCase(assetRepo, storage)
    const result = await useCase.execute({ assetId: "asset-1" })

    expect(result.asset.mimeType).toBe("image/png")
    expect(result.asset.sizeBytes).toBe(10)

    const chunks: Buffer[] = []
    for await (const chunk of result.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    expect(Buffer.concat(chunks).toString()).toBe("image data")
  })

  it("throws if asset not found", async () => {
    const assetRepo: CharacterAssetRepository = {
      create: async () => {},
      findById: async () => null,
      findByCharacterId: async () => [],
      deleteById: async () => {},
    }

    const useCase = new GetCharacterAssetUseCase(assetRepo, storage)
    await expect(useCase.execute({ assetId: "nonexistent" })).rejects.toThrow("not found")
  })

  it("prefers an optimized variant and marks the response cacheable", async () => {
    await storage.write("char-1", "asset-1", "png", Buffer.from("original"))
    await storage.writeVariant(
      "char-1",
      "asset-1",
      "thumbnail",
      Buffer.from("webp-thumbnail"),
    )
    const assetRepo: CharacterAssetRepository = {
      create: async () => {},
      findById: async () => ({
        id: "asset-1",
        characterId: "char-1",
        mimeType: "image/png",
        sizeBytes: 8,
        extension: "png",
        width: 64,
        height: 64,
        createdAt: new Date(),
      }),
      findByCharacterId: async () => [],
      deleteById: async () => {},
    }

    const result = await new GetCharacterAssetUseCase(assetRepo, storage).execute({
      assetId: "asset-1",
      variant: "thumbnail",
    })
    const chunks: Buffer[] = []
    for await (const chunk of result.stream) chunks.push(Buffer.from(chunk))

    expect(result.isVariant).toBe(true)
    expect(result.asset.mimeType).toBe("image/png")
    expect(Buffer.concat(chunks)).toEqual(Buffer.from("webp-thumbnail"))
  })

  it("falls back to the original when a GIF has no static variant", async () => {
    const gif = Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64")
    await storage.write("char-1", "asset-gif", "gif", gif)
    const assetRepo: CharacterAssetRepository = {
      create: async () => {},
      findById: async () => ({
        id: "asset-gif",
        characterId: "char-1",
        mimeType: "image/gif",
        sizeBytes: gif.length,
        extension: "gif",
        width: 1,
        height: 1,
        createdAt: new Date(),
      }),
      findByCharacterId: async () => [],
      deleteById: async () => {},
    }

    const result = await new GetCharacterAssetUseCase(assetRepo, storage).execute({
      assetId: "asset-gif",
      variant: "thumbnail",
    })
    const chunks: Buffer[] = []
    for await (const chunk of result.stream) chunks.push(Buffer.from(chunk))

    expect(result.isVariant).toBe(false)
    expect(result.asset.mimeType).toBe("image/gif")
    expect(Buffer.concat(chunks)).toEqual(gif)
  })
})
