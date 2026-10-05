import { describe, it, expect } from "vitest"
import { beforeEach } from "vitest"

import { resolveEffectiveProfileImageAssetId } from "./effective-profile-image"
import type { CharacterAssetRepository } from "../ports/character-asset.repository"
import type { CharacterAssetMetadata } from "../ports/character-asset.repository"

const now = new Date("2026-08-06T12:00:00Z")

const buildAssetRepo = (existing: string[]): CharacterAssetRepository => ({
  create: async () => {},
  findById: async (id: string): Promise<CharacterAssetMetadata | null> =>
    existing.includes(id)
      ? {
          id,
          characterId: "char-1",
          mimeType: "image/png",
          sizeBytes: 10,
          extension: "png",
          width: 1,
          height: 1,
          createdAt: now,
        }
      : null,
  findByCharacterId: async () => [],
  deleteById: async () => {},
})

describe("resolveEffectiveProfileImageAssetId", () => {
  let assetRepo: CharacterAssetRepository

  beforeEach(() => {
    assetRepo = buildAssetRepo(["override-1"])
  })

  it("returns the override when it exists", async () => {
    const result = await resolveEffectiveProfileImageAssetId(
      "override-1",
      "character-image",
      assetRepo,
    )
    expect(result).toBe("override-1")
  })

  it("falls back to the character image when there is no override", async () => {
    const result = await resolveEffectiveProfileImageAssetId(
      null,
      "character-image",
      assetRepo,
    )
    expect(result).toBe("character-image")
  })

  it("falls back to the character image when the override asset is gone", async () => {
    const result = await resolveEffectiveProfileImageAssetId(
      "missing-override",
      "character-image",
      assetRepo,
    )
    expect(result).toBe("character-image")
  })

  it("returns null when there is no override and no character image", async () => {
    const result = await resolveEffectiveProfileImageAssetId(null, null, assetRepo)
    expect(result).toBeNull()
  })
})
