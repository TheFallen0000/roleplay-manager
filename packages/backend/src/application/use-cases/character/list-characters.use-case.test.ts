import { describe, it, expect, vi } from "vitest"

import { ListCharactersUseCase } from "./list-characters.use-case"
import type {
  CharacterSummaryRepository,
  CharacterVersionSummary,
  CharacterWithCurrentVersionSummary,
} from "../../../domain/ports/character.repository"
import type { CharacterAssetLookupRepository } from "../../../domain/ports/character-asset.repository"
import { Character } from "../../../domain/entities/character.entity"

const now = new Date()
const char1 = Character.create({ id: "c1", name: "Alpha", createdAt: now, updatedAt: now })
const char2 = Character.create({ id: "c2", name: "Beta", createdAt: now, updatedAt: now })

const version = (
  overrides: Partial<CharacterVersionSummary> = {},
): CharacterVersionSummary => ({
  id: "v1",
  characterId: "c1",
  name: "Alpha",
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
  ...overrides,
})

const entries: CharacterWithCurrentVersionSummary[] = [
  { character: char1, currentVersion: version({ subtitle: "Sub" }) },
  {
    character: char2,
    currentVersion: version({
      id: "v2",
      characterId: "c2",
      name: "Beta",
    }),
  },
]

const buildRepo = (
  current = entries,
): CharacterSummaryRepository => ({
  listCurrentVersionSummaries: vi.fn(async () => current),
  findCurrentVersionSummaryByCharacterId: vi.fn(
    async () => current[0]?.currentVersion ?? null,
  ),
  findVersionSummariesByIds: vi.fn(async () => []),
})

const buildAssetRepo = (): CharacterAssetLookupRepository => ({
  findByIds: vi.fn(async () => []),
})

describe("ListCharactersUseCase", () => {
  it("retorna lista de CharacterSummary", async () => {
    const useCase = new ListCharactersUseCase(buildRepo(), buildAssetRepo())
    const result = await useCase.execute()

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("Alpha")
    expect(result[0].subtitle).toBe("Sub")
    expect(result[1].name).toBe("Beta")
    expect(result[1].subtitle).toBeNull()
  })

  it("retorna lista vacia si no hay personajes", async () => {
    const useCase = new ListCharactersUseCase(buildRepo([]), buildAssetRepo())
    expect(await useCase.execute()).toEqual([])
  })

  it("incluye dimensiones y MIME del asset para construir srcset", async () => {
    const assetRepo: CharacterAssetLookupRepository = {
      findByIds: vi.fn(async () => [
        {
          id: "asset-1",
          characterId: "c1",
          mimeType: "image/png",
          sizeBytes: 1024,
          extension: "png",
          width: 1200,
          height: 600,
          createdAt: now,
        },
      ]),
    }
    const characterRepo = buildRepo([
      {
        character: char1,
        currentVersion: version({ profileImageAssetId: "asset-1" }),
      },
    ])

    const result = await new ListCharactersUseCase(
      characterRepo,
      assetRepo,
    ).execute()

    expect(result[0].profileImageDimensions).toEqual({ width: 1200, height: 600 })
    expect(result[0].profileImageMimeType).toBe("image/png")
    expect(assetRepo.findByIds).toHaveBeenCalledWith(["asset-1"])
  })
})
