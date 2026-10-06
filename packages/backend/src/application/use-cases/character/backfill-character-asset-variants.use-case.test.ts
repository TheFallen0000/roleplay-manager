import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { CharacterAssetImageProcessor } from "../../../domain/ports/character-asset-image-processor"
import type { CharacterAssetMetadata } from "../../../domain/ports/character-asset.repository"
import { FilesystemCharacterAssetStorage } from "../../../infrastructure/adapters/secondary/filesystem/filesystem-character-asset-storage"
import { BackfillCharacterAssetVariantsUseCase } from "./backfill-character-asset-variants.use-case"

const original = Buffer.from("legacy-original")

describe("BackfillCharacterAssetVariantsUseCase", () => {
  let root: string
  let storage: FilesystemCharacterAssetStorage
  let assets: CharacterAssetMetadata[]
  let updateDimensions: ReturnType<typeof vi.fn>
  let processor: CharacterAssetImageProcessor

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "backfill-image-"))
    storage = new FilesystemCharacterAssetStorage(root)
    assets = [
      {
        id: "asset-png",
        characterId: "char-1",
        mimeType: "image/png",
        sizeBytes: original.length,
        extension: "png",
        width: null,
        height: null,
        createdAt: new Date(),
      },
      {
        id: "asset-gif",
        characterId: "char-1",
        mimeType: "image/gif",
        sizeBytes: original.length,
        extension: "gif",
        width: null,
        height: null,
        createdAt: new Date(),
      },
    ]
    await storage.write("char-1", "asset-png", "png", original)
    await storage.write("char-1", "asset-gif", "gif", original)
    updateDimensions = vi.fn(async (id: string, width: number, height: number) => {
      const asset = assets.find((item) => item.id === id)
      if (asset) {
        asset.width = width
        asset.height = height
      }
    })
    processor = {
      process: async (_data, mimeType) => ({
        width: 512,
        height: 256,
        variants:
          mimeType === "image/gif"
            ? []
            : [
                {
                  variant: "thumbnail",
                  width: 128,
                  height: 64,
                  data: Buffer.from("thumb-webp"),
                },
                {
                  variant: "small",
                  width: 384,
                  height: 192,
                  data: Buffer.from("small-webp"),
                },
                {
                  variant: "medium",
                  width: 512,
                  height: 256,
                  data: Buffer.from("medium-webp"),
                },
              ],
      }),
    }
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const createUseCase = () =>
    new BackfillCharacterAssetVariantsUseCase(
      {
        create: async () => {},
        findById: async () => null,
        findByCharacterId: async () => [],
        findAll: async () => assets,
        updateDimensions,
        deleteById: async () => {},
      },
      storage,
      processor,
    )

  it("supports dry-run without writing files or metadata", async () => {
    const result = await createUseCase().execute({ dryRun: true })

    expect(result.total).toBe(2)
    expect(result.processed).toBe(2)
    expect(result.variantsToCreate).toBe(3)
    expect(result.gifsSkipped).toBe(1)
    expect(updateDimensions).not.toHaveBeenCalled()
    expect(await storage.hasVariant("char-1", "asset-png", "thumbnail")).toBe(false)
  })

  it("is idempotent, fills dimensions and leaves GIFs unmodified", async () => {
    const useCase = createUseCase()
    const first = await useCase.execute()
    const second = await useCase.execute()

    expect(first.variantsToCreate).toBe(3)
    expect(second.variantsToCreate).toBe(0)
    expect(second.variantsSkipped).toBe(3)
    expect(updateDimensions).toHaveBeenCalledTimes(2)
    expect(assets[0].width).toBe(512)
    expect(assets[0].height).toBe(256)
    expect(await storage.hasVariant("char-1", "asset-png", "medium")).toBe(true)
    expect(await storage.hasVariant("char-1", "asset-gif", "thumbnail")).toBe(false)
  })

  it("reports delivered bytes per consumer and pending variants", async () => {
    const useCase = createUseCase()
    const before = await useCase.report()

    expect(before.total).toBe(2)
    expect(before.gifsSkipped).toBe(1)
    expect(before.assets[0].missingVariants).toEqual([
      "thumbnail",
      "small",
      "medium",
    ])
    expect(before.assets[0].cardVariant).toBe("original")
    expect(before.assets[0].avatarVariant).toBe("original")
    expect(before.totals.cardBytes).toBe(before.totals.originalBytes)
    expect(before.totals.cardSavingsPercent).toBe(0)

    await useCase.execute()
    const after = await useCase.report()

    expect(after.assets[0].missingVariants).toEqual([])
    expect(after.assets[0].variantBytes.thumbnail).toBeGreaterThan(0)
    expect(after.assets[0].cardVariant).toBe("medium")
    expect(after.assets[0].avatarVariant).toBe("thumbnail")
    expect(after.totals.cardBytes).toBeLessThan(after.totals.originalBytes)
    expect(after.totals.avatarBytes).toBeLessThan(after.totals.cardBytes)
    expect(after.totals.cardSavingsPercent).toBeGreaterThan(0)
    expect(after.totals.avatarSavingsPercent).toBeGreaterThan(
      after.totals.cardSavingsPercent,
    )
  })
})
