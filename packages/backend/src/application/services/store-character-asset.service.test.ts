import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { CharacterAssetImageProcessor } from "../../domain/ports/character-asset-image-processor"
import type { CharacterAssetMetadata } from "../../domain/ports/character-asset.repository"
import { FilesystemCharacterAssetStorage } from "../../infrastructure/adapters/secondary/filesystem/filesystem-character-asset-storage"
import { StoreCharacterAssetService } from "./store-character-asset.service"

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe("StoreCharacterAssetService", () => {
  let root: string
  let storage: FilesystemCharacterAssetStorage

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "store-image-"))
    storage = new FilesystemCharacterAssetStorage(root)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it("stores the original and generated variants before registering metadata", async () => {
    const created: CharacterAssetMetadata[] = []
    const create = vi.fn(async (metadata: CharacterAssetMetadata) => {
      created.push(metadata)
    })
    const processor: CharacterAssetImageProcessor = {
      process: async () => ({
        width: 100,
        height: 50,
        variants: [
          {
            variant: "thumbnail",
            width: 100,
            height: 50,
            data: Buffer.from("webp-thumbnail"),
          },
        ],
      }),
    }
    const service = new StoreCharacterAssetService(
      {
        create,
        findById: async () => null,
        findByCharacterId: async () => [],
        deleteById: async () => {},
      },
      storage,
      processor,
      1024,
    )

    const asset = await service.store({
      characterId: "char-1",
      mimeType: "image/png",
      data: png,
    })

    expect(asset.width).toBe(100)
    expect(asset.height).toBe(50)
    expect(create).toHaveBeenCalledOnce()
    expect(await storage.hasVariant("char-1", asset.id, "thumbnail")).toBe(true)
    const original = await storage.read("char-1", asset.id, "png")
    const chunks: Buffer[] = []
    for await (const chunk of original) chunks.push(Buffer.from(chunk))
    expect(Buffer.concat(chunks)).toEqual(png)
  })

  it("cleans partial files if metadata persistence fails", async () => {
    const processor: CharacterAssetImageProcessor = {
      process: async () => ({
        width: 100,
        height: 50,
        variants: [
          {
            variant: "thumbnail",
            width: 100,
            height: 50,
            data: Buffer.from("webp-thumbnail"),
          },
        ],
      }),
    }
    const service = new StoreCharacterAssetService(
      {
        create: async () => {
          throw new Error("database write failed")
        },
        findById: async () => null,
        findByCharacterId: async () => [],
        deleteById: async () => {},
      },
      storage,
      processor,
      1024,
    )

    await expect(
      service.store({ characterId: "char-1", mimeType: "image/png", data: png }),
    ).rejects.toThrow("database write failed")

    // The service creates a fresh UUID for each attempted write; no asset path
    // or variant directory should be left behind under the character folder.
    const { readdir } = await import("node:fs/promises")
    await expect(readdir(join(root, "char-1"))).resolves.toEqual([])
  })
})
