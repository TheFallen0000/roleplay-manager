import { describe, it, expect, vi } from "vitest"

import { UpdateCharacterUseCase } from "./update-character.use-case"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { CharacterCard } from "../../../domain/entities/character-card.entity"

const now = new Date()
const card = CharacterCard.create({
  id: "card-1", versionId: "ver-1", title: "Old Card",
  content: "Old content", position: 0, active: true,
})
const character = Character.create({ id: "char-1", name: "Original", createdAt: now, updatedAt: now })
const version = CharacterVersion.create({
  id: "ver-1", characterId: "char-1", name: "Original",
  subtitle: "sub", profileImageAssetId: null, description: "desc",
  instructions: "instr", greeting: "hi", versionNumber: 1, createdAt: now, cards: [card],
  lorebookVersionId: "lv-1",
} as never)

const linkedId = (value: CharacterVersion | null): unknown =>
  value ? (value as unknown as Record<string, unknown>).lorebookVersionId : null

const lorebookVersionRepository = (found = true) => ({
  findVersionById: async () => (found ? { id: "lv-2" } : null),
  findByCharacterId: async () => null,
  findById: async () => null,
  findVersions: async () => [],
  list: async () => [],
  createContainerWithVersion: async () => ({}),
  saveLiveHeadAndVersion: async () => ({}),
  upsertBook: async (book: unknown) => book,
  createEntry: async (entry: unknown) => entry,
  updateEntry: async (entry: unknown) => entry,
  deleteEntry: async () => {},
  reorderEntries: async () => {},
  replaceBook: async () => {},
})

let savedVersion: CharacterVersion | null = null

const buildRepo = () => ({
  createWithFirstVersion: async () => ({ character, version }),
  findById: async (id: string) =>
    id === "char-1" ? { character, currentVersion: version } : null,
  list: async () => [character],
  update: async (c: Character) => c,
  delete: async () => {},
  findVersionById: async () => null,
  findVersionsByCharacterId: async () =>
    savedVersion ? [version, savedVersion] : [version],
  findMaxVersionNumber: async () => 1,
  saveVersion: vi.fn(async (v: CharacterVersion) => {
    savedVersion = v
    return v
  }),
  updateProfileImageAssetId: async () => {},
})

describe("UpdateCharacterUseCase", () => {
  it("crea nueva version al cambiar el nombre", async () => {
    savedVersion = null
    const useCase = new UpdateCharacterUseCase(buildRepo())
    const result = await useCase.execute("char-1", { name: "Updated" })

    expect(result.name).toBe("Updated")
    expect(result.currentVersion.versionNumber).toBe(2)
    expect(result.currentVersion.name).toBe("Updated")
    expect(result.versions).toHaveLength(2)
  })

  it("lanza NoChangesDetectedError si no hay cambios", async () => {
    savedVersion = null
    const useCase = new UpdateCharacterUseCase(buildRepo())

    await expect(
      useCase.execute("char-1", {}),
    ).rejects.toThrow("No changes detected for the character.")
  })

  it("lanza CharacterNotFoundError si no existe", async () => {
    savedVersion = null
    const useCase = new UpdateCharacterUseCase(buildRepo())

    await expect(
      useCase.execute("nonexistent", { name: "X" }),
    ).rejects.toThrow("Character with id 'nonexistent' not found.")
  })

  it("copies the previous lorebook link when lorebookVersionId is undefined", async () => {
    savedVersion = null
    const useCase = new UpdateCharacterUseCase(buildRepo())

    await useCase.execute("char-1", { name: "Updated" })

    expect(linkedId(savedVersion)).toBe("lv-1")
  })

  it("removes the link when lorebookVersionId is null and still creates a version", async () => {
    savedVersion = null
    const useCase = new UpdateCharacterUseCase(buildRepo())

    await useCase.execute("char-1", { lorebookVersionId: null })

    expect(savedVersion).not.toBeNull()
    expect(linkedId(savedVersion)).toBeNull()
  })

  it("links a lorebook version and creates exactly one character version", async () => {
    savedVersion = null
    const repository = buildRepo()
    const useCase = new UpdateCharacterUseCase(repository, {
      lorebookRepository: lorebookVersionRepository(true),
    } as never)

    const result = await useCase.execute("char-1", {
      lorebookVersionId: "lv-2",
    })

    expect(repository.saveVersion).toHaveBeenCalledTimes(1)
    expect(linkedId(savedVersion)).toBe("lv-2")
    expect(result.currentVersion.versionNumber).toBe(2)
  })

  it("rejects an unknown lorebook version with LOREBOOK_VERSION_NOT_FOUND", async () => {
    savedVersion = null
    const repository = buildRepo()
    const useCase = new UpdateCharacterUseCase(repository, {
      lorebookRepository: lorebookVersionRepository(false),
    } as never)

    await expect(
      useCase.execute("char-1", { lorebookVersionId: "missing" }),
    ).rejects.toMatchObject({ code: "LOREBOOK_VERSION_NOT_FOUND" })
    expect(repository.saveVersion).not.toHaveBeenCalled()
  })
})
