import { describe, expect, it, vi } from "vitest"

import { GetLorebookUsageUseCase } from "./get-lorebook-usage.use-case"

const now = new Date("2026-11-20T12:00:00.000Z")

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

const version = (id: string, versionNumber: number) => ({
  id,
  lorebookId: "book-1",
  versionNumber,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  entriesJson: "[]",
  sourceKey: String(versionNumber).repeat(64),
  createdAt: now,
})

const usageRows = [
  {
    characterVersionId: "cv-a1",
    characterVersionNumber: 1,
    characterId: "char-a",
    characterName: "Alice",
    lorebookVersionNumber: 1,
  },
  {
    characterVersionId: "cv-a2",
    characterVersionNumber: 2,
    characterId: "char-a",
    characterName: "Alice",
    lorebookVersionNumber: 1,
  },
  {
    characterVersionId: "cv-a3",
    characterVersionNumber: 3,
    characterId: "char-a",
    characterName: "Alice",
    lorebookVersionNumber: 3,
  },
  {
    characterVersionId: "cv-a4",
    characterVersionNumber: 4,
    characterId: "char-a",
    characterName: "Alice",
    lorebookVersionNumber: 2,
  },
  {
    characterVersionId: "cv-b2",
    characterVersionNumber: 2,
    characterId: "char-b",
    characterName: "Bob",
    lorebookVersionNumber: 2,
  },
]

const buildRepository = (overrides: Record<string, unknown> = {}) => ({
  findById: vi.fn(async (_id: string) => ({ book, entries: [] })),
  findVersionById: vi.fn(async (id: string) =>
    id === "version-2"
      ? version("version-2", 2)
      : id === "version-1"
        ? version("version-1", 1)
        : null,
  ),
  findVersions: vi.fn(async (_lorebookId: string) => [
    version("version-1", 1),
    version("version-2", 2),
    version("version-3", 3),
  ]),
  findUsageVersions: vi.fn(async (_lorebookId: string) => usageRows),
  findCurrentCharacterVersionNumbers: vi.fn(async (_characterIds: string[]) => [
    { characterId: "char-a", versionNumber: 4 },
    { characterId: "char-b", versionNumber: 2 },
  ]),
  ...overrides,
})

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

describe("GetLorebookUsageUseCase", () => {
  it("groups in-use and history by character without per-row lookups", async () => {
    const repository = buildRepository()
    const useCase = new GetLorebookUsageUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({
      lorebookId: "book-1",
      versionId: "version-2",
    })

    expect(repository.findUsageVersions).toHaveBeenCalledTimes(1)
    expect(repository.findUsageVersions).toHaveBeenCalledWith("book-1")
    expect(
      repository.findCurrentCharacterVersionNumbers,
    ).toHaveBeenCalledTimes(1)
    const ids = repository.findCurrentCharacterVersionNumbers.mock
      .calls[0][0] as string[]
    expect(ids).toHaveLength(2)
    expect(new Set(ids)).toEqual(new Set(["char-a", "char-b"]))

    // Shape assertion: one batch call is allowed to resolve the selected
    // version, but never one lookup per usage row.
    expect(repository.findVersionById.mock.calls.length).toBeLessThanOrEqual(1)

    expect(result).toEqual({
      characters: [
        {
          characterId: "char-a",
          characterName: "Alice",
          inUse: [
            {
              characterVersionId: "cv-a4",
              characterVersionNumber: 4,
              isCurrentCharacterVersion: true,
              lorebookVersionNumber: 2,
            },
          ],
          history: [
            {
              characterVersionId: "cv-a2",
              characterVersionNumber: 2,
              isCurrentCharacterVersion: false,
              lorebookVersionNumber: 1,
            },
            {
              characterVersionId: "cv-a1",
              characterVersionNumber: 1,
              isCurrentCharacterVersion: false,
              lorebookVersionNumber: 1,
            },
          ],
        },
        {
          characterId: "char-b",
          characterName: "Bob",
          inUse: [
            {
              characterVersionId: "cv-b2",
              characterVersionNumber: 2,
              isCurrentCharacterVersion: true,
              lorebookVersionNumber: 2,
            },
          ],
          history: [],
        },
      ],
    })
  })

  it("defaults to the current version when versionId is omitted", async () => {
    const repository = buildRepository()
    const useCase = new GetLorebookUsageUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({ lorebookId: "book-1" })

    expect(repository.findVersionById).toHaveBeenCalledWith("version-2")
    expect(result.characters[1].inUse).toHaveLength(1)
  })

  it("returns LOREBOOK_NOT_FOUND for a deleted book", async () => {
    const repository = buildRepository({
      findById: vi.fn(async () => ({
        book: { ...book, deletedAt: now },
        entries: [],
      })),
    })
    const useCase = new GetLorebookUsageUseCase({
      lorebookRepository: repository,
    } as never)

    const error = await capture(useCase.execute({ lorebookId: "book-1" }))

    expect(error).toMatchObject({ code: "LOREBOOK_NOT_FOUND" })
    expect(repository.findUsageVersions).not.toHaveBeenCalled()
  })
})
