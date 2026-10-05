import { describe, it, expect, vi } from "vitest"

import { UpdateCharacterProfileImageUseCase } from "./update-character-profile-image.use-case"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"

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
  subtitle: null,
  profileImageAssetId: null,
  description: "A guard",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const buildRepo = (overrides: Partial<CharacterRepository> = {}): CharacterRepository => ({
  createWithFirstVersion: async (c, v) => ({ character: c, version: v }),
  findById: async () => ({ character, currentVersion: version }),
  findVersionsByCharacterId: async () => [version],
  list: async () => [],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async () => version,
  findMaxVersionNumber: async () => 1,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
  ...overrides,
})

const buildAssetRepo = (exists: boolean): CharacterAssetRepository => ({
  create: async () => {},
  findById: async () =>
    exists ? { id: "asset-1", characterId: "char-1", mimeType: "image/png", sizeBytes: 10, extension: "png", width: 1, height: 1, createdAt: now } : null,
  findByCharacterId: async () => [],
  deleteById: async () => {},
})

describe("UpdateCharacterProfileImageUseCase", () => {
  it("actualiza la imagen de la versión actual sin crear una versión nueva", async () => {
    const updateProfileImageAssetId = vi.fn()
    const repo = buildRepo({ updateProfileImageAssetId })

    const useCase = new UpdateCharacterProfileImageUseCase(
      repo,
      buildAssetRepo(true),
    )

    const result = await useCase.execute("char-1", "asset-1")

    expect(updateProfileImageAssetId).toHaveBeenCalledWith("ver-1", "asset-1")
    expect(result.currentVersion.versionNumber).toBe(1)
    expect(result.versions).toHaveLength(1)
  })

  it("lanza CharacterNotFoundError si el personaje no existe", async () => {
    const repo = buildRepo({ findById: async () => null })

    const useCase = new UpdateCharacterProfileImageUseCase(
      repo,
      buildAssetRepo(true),
    )

    await expect(useCase.execute("missing", "asset-1")).rejects.toThrow(
      "Character with id 'missing' not found.",
    )
  })

  it("lanza CharacterAssetNotFoundError si el asset no existe", async () => {
    const updateProfileImageAssetId = vi.fn()
    const repo = buildRepo({ updateProfileImageAssetId })

    const useCase = new UpdateCharacterProfileImageUseCase(
      repo,
      buildAssetRepo(false),
    )

    await expect(useCase.execute("char-1", "asset-missing")).rejects.toThrow(
      "Character asset with id 'asset-missing' not found.",
    )
    expect(updateProfileImageAssetId).not.toHaveBeenCalled()
  })

  it("permite limpiar la imagen con null", async () => {
    const updateProfileImageAssetId = vi.fn()
    const repo = buildRepo({ updateProfileImageAssetId })

    const useCase = new UpdateCharacterProfileImageUseCase(
      repo,
      buildAssetRepo(false),
    )

    const result = await useCase.execute("char-1", null)

    expect(updateProfileImageAssetId).toHaveBeenCalledWith("ver-1", null)
    expect(result.currentVersion.versionNumber).toBe(1)
  })
})
