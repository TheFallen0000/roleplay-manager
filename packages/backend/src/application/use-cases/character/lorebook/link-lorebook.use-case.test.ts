import { describe, expect, it, vi } from "vitest"

import type { CharacterVersionDTO } from "@workspace/shared/types/character"

import { Character } from "../../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../../domain/entities/character-version.entity"

import { LinkLorebookUseCase } from "./link-lorebook.use-case"

const now = new Date("2026-11-20T12:00:00.000Z")

const character = Character.create({
  id: "char-1",
  name: "Lyra",
  createdAt: now,
  updatedAt: now,
})

const currentVersion = (lorebookVersionId: string | null = null) =>
  CharacterVersion.create({
    id: "ver-1",
    characterId: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    description: "A guardian of the forest.",
    instructions: null,
    greeting: "Hello, traveler.",
    versionNumber: 1,
    createdAt: now,
    cards: [],
    lorebookVersionId,
  } as never)

const book = {
  id: "book-1",
  characterId: null,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  originId: "origin-1",
  currentVersionId: "version-2",
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
}

const lorebookVersion = (overrides: Record<string, unknown> = {}) => ({
  id: "version-2",
  lorebookId: "book-1",
  versionNumber: 2,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  entriesJson: "[]",
  sourceKey: "b".repeat(64),
  createdAt: now,
  ...overrides,
})

const linkedDTO: CharacterVersionDTO = {
  id: "ver-2",
  characterId: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: null,
  greeting: "Hello, traveler.",
  versionNumber: 2,
  createdAt: now.toISOString(),
  cards: [],
  alternateGreetings: [],
  lorebookVersion: null,
}

const updatedDetail = {
  id: "char-1",
  name: "Lyra",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  currentVersion: linkedDTO,
  versions: [linkedDTO],
}

const buildDeps = (options: {
  current?: CharacterVersion
  foundCharacter?: boolean
  bookDeletedAt?: Date | null
  versionLorebookId?: string
} = {}) => {
  const version = options.current ?? currentVersion(null)
  const updateCharacter = {
    execute: vi.fn(async () => updatedDetail),
  }

  return {
    lorebookRepository: {
      findById: vi.fn(async () => ({
        book: { ...book, deletedAt: options.bookDeletedAt ?? null },
        entries: [],
      })),
      findVersionById: vi.fn(async () =>
        lorebookVersion({
          lorebookId: options.versionLorebookId ?? "book-1",
        }),
      ),
    },
    characterRepository: {
      findById: vi.fn(async () =>
        options.foundCharacter === false
          ? null
          : { character, currentVersion: version },
      ),
    },
    updateCharacter,
    characterVersion: version,
  }
}

const capture = async (
  promise: Promise<unknown>,
): Promise<{ code?: string; statusCode?: number } | null> => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { code?: string; statusCode?: number }
  }
}

describe("LinkLorebookUseCase", () => {
  it("creates exactly one new character version and returns its DTO", async () => {
    const deps = buildDeps()
    const useCase = new LinkLorebookUseCase({
      lorebookRepository: deps.lorebookRepository,
      characterRepository: deps.characterRepository,
      updateCharacter: deps.updateCharacter,
    } as never)

    const result = await useCase.execute({
      lorebookId: "book-1",
      characterId: "char-1",
      versionId: "version-2",
    })

    expect(deps.updateCharacter.execute).toHaveBeenCalledTimes(1)
    expect(deps.updateCharacter.execute).toHaveBeenCalledWith(
      "char-1",
      expect.objectContaining({ lorebookVersionId: "version-2" }),
    )
    expect(result).toEqual(linkedDTO)
    expect(deps.characterVersion.lorebookVersionId).toBeNull()
  })

  it("returns LOREBOOK_LINK_UNCHANGED when the current version already uses it", async () => {
    const deps = buildDeps({ current: currentVersion("version-2") })
    const useCase = new LinkLorebookUseCase({
      lorebookRepository: deps.lorebookRepository,
      characterRepository: deps.characterRepository,
      updateCharacter: deps.updateCharacter,
    } as never)

    const error = await capture(
      useCase.execute({
        lorebookId: "book-1",
        characterId: "char-1",
        versionId: "version-2",
      }),
    )

    expect(error).toMatchObject({ code: "LOREBOOK_LINK_UNCHANGED" })
    expect(deps.updateCharacter.execute).not.toHaveBeenCalled()
  })

  it("rejects a deleted book", async () => {
    const deps = buildDeps({ bookDeletedAt: now })
    const useCase = new LinkLorebookUseCase({
      lorebookRepository: deps.lorebookRepository,
      characterRepository: deps.characterRepository,
      updateCharacter: deps.updateCharacter,
    } as never)

    const error = await capture(
      useCase.execute({
        lorebookId: "book-1",
        characterId: "char-1",
        versionId: "version-2",
      }),
    )

    expect(error).toMatchObject({ code: "LOREBOOK_NOT_FOUND" })
    expect(deps.updateCharacter.execute).not.toHaveBeenCalled()
  })

  it("rejects a version that belongs to another book", async () => {
    const deps = buildDeps({ versionLorebookId: "book-2" })
    const useCase = new LinkLorebookUseCase({
      lorebookRepository: deps.lorebookRepository,
      characterRepository: deps.characterRepository,
      updateCharacter: deps.updateCharacter,
    } as never)

    const error = await capture(
      useCase.execute({
        lorebookId: "book-1",
        characterId: "char-1",
        versionId: "version-2",
      }),
    )

    expect(error).toMatchObject({ code: "LOREBOOK_VERSION_NOT_FOUND" })
    expect(deps.updateCharacter.execute).not.toHaveBeenCalled()
  })

  it("rejects a missing character", async () => {
    const deps = buildDeps({ foundCharacter: false })
    const useCase = new LinkLorebookUseCase({
      lorebookRepository: deps.lorebookRepository,
      characterRepository: deps.characterRepository,
      updateCharacter: deps.updateCharacter,
    } as never)

    const error = await capture(
      useCase.execute({
        lorebookId: "book-1",
        characterId: "missing",
        versionId: "version-2",
      }),
    )

    expect(error).toMatchObject({ code: "CHARACTER_NOT_FOUND" })
    expect(deps.updateCharacter.execute).not.toHaveBeenCalled()
  })
})
