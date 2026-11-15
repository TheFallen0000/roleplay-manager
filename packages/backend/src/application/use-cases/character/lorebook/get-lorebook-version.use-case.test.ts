import { describe, expect, it, vi } from "vitest"

import { GetLorebookVersionUseCase } from "./get-lorebook-version.use-case"

const entries = [
  {
    id: "entry-1",
    name: "Dragon lore",
    sourceId: "1",
    keys: ["dragon"],
    secondaryKeys: [],
    comment: "Dragon lore",
    content: "Dragons dwell in the northern mountains.",
    constant: false,
    selective: false,
    selectiveLogic: 0,
    insertionOrder: 100,
    position: "after_char",
    rawPosition: "1",
    priority: 0,
    enabled: true,
    caseSensitive: false,
    wholeWords: false,
    order: 0,
    extensions: {},
    unknownFields: null,
  },
]

const version = {
  id: "version-1",
  lorebookId: "book-1",
  versionNumber: 2,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 8,
  tokenBudget: 900,
  recursiveScanning: true,
  entriesJson: JSON.stringify(entries),
  sourceKey: "b".repeat(64),
  createdAt: new Date("2026-11-11T12:00:00.000Z"),
}

const buildRepository = (found: unknown) => ({
  findVersionById: vi.fn(async () => found),
  findById: vi.fn(async () => null),
  findVersions: vi.fn(async () => []),
  list: vi.fn(async () => []),
  findByCharacterId: vi.fn(async () => null),
  createContainerWithVersion: vi.fn(async () => ({})),
  saveLiveHeadAndVersion: vi.fn(async () => ({})),
  upsertBook: vi.fn(async (book) => book),
  createEntry: vi.fn(async (entry) => entry),
  updateEntry: vi.fn(async (entry) => entry),
  deleteEntry: vi.fn(async () => {}),
  reorderEntries: vi.fn(async () => {}),
  replaceBook: vi.fn(async () => {}),
})

const capture = async (promise: Promise<unknown>): Promise<{ code?: string } | null> => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { code?: string }
  }
}

describe("GetLorebookVersionUseCase — read-only version", () => {
  it("deserializes entries_json into a version DTO", async () => {
    const repository = buildRepository(version)
    const useCase = new GetLorebookVersionUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({
      lorebookId: "book-1",
      versionId: "version-1",
    })

    expect(repository.findVersionById).toHaveBeenCalledWith("version-1")
    expect(result).toMatchObject({
      id: "version-1",
      lorebookId: "book-1",
      versionNumber: 2,
      name: "Forest lore",
      scanDepth: 8,
      tokenBudget: 900,
      recursiveScanning: true,
      sourceKey: "b".repeat(64),
    })
    expect(result.entries).toEqual(entries)
  })

  it("throws LOREBOOK_VERSION_NOT_FOUND for a missing version", async () => {
    const repository = buildRepository(null)
    const useCase = new GetLorebookVersionUseCase({
      lorebookRepository: repository,
    } as never)

    const error = await capture(
      useCase.execute({ lorebookId: "book-1", versionId: "missing" }),
    )

    expect(error).toMatchObject({ code: "LOREBOOK_VERSION_NOT_FOUND" })
  })
})
