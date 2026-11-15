import { describe, expect, it, vi } from "vitest"

import { CreateLorebookUseCase } from "./create-lorebook.use-case"

const buildRepository = () => ({
  createContainerWithVersion: vi.fn(async (book, entries, version) => ({
    book,
    entries,
    version,
  })),
  findByCharacterId: vi.fn(async () => null),
  findById: vi.fn(async () => null),
  list: vi.fn(async () => []),
  findVersions: vi.fn(async () => []),
  findVersionById: vi.fn(async () => null),
  upsertBook: vi.fn(async (book) => book),
  createEntry: vi.fn(async (entry) => entry),
  updateEntry: vi.fn(async (entry) => entry),
  deleteEntry: vi.fn(async () => {}),
  reorderEntries: vi.fn(async () => {}),
  replaceBook: vi.fn(async () => {}),
  saveLiveHeadAndVersion: vi.fn(async (book) => book),
})

describe("CreateLorebookUseCase — standalone lorebook", () => {
  it("creates a container and v1 without a character", async () => {
    const repository = buildRepository()
    const useCase = new CreateLorebookUseCase({ lorebookRepository: repository } as never)

    const result = await useCase.execute({
      name: "Forest lore",
      description: "Facts about the forest",
      scanDepth: 8,
      tokenBudget: 900,
      recursiveScanning: true,
      entries: [
        { keys: ["dragon"], content: "Dragons dwell in the northern mountains." },
        { keys: ["river"], content: "The river is old." },
      ],
    })

    expect(repository.createContainerWithVersion).toHaveBeenCalledTimes(1)
    const [book, entries, version] = repository.createContainerWithVersion.mock
      .calls[0] as [
      Record<string, unknown>,
      Array<Record<string, unknown>>,
      Record<string, unknown>,
    ]

    expect(book.characterId ?? null).toBeNull()
    expect(book.name).toBe("Forest lore")
    expect(entries).toHaveLength(2)
    expect(version.versionNumber).toBe(1)
    expect(version.lorebookId).toBe(book.id)
    expect(version.entriesJson).toEqual(expect.any(String))
    expect(version.sourceKey).toMatch(/^[0-9a-f]{64}$/)

    expect(result).toMatchObject({
      id: book.id,
      name: "Forest lore",
      scanDepth: 8,
      tokenBudget: 900,
      recursiveScanning: true,
    })
    expect(result.characterId ?? null).toBeNull()
    expect(result.entries.map((entry) => entry.keys)).toEqual([
      ["dragon"],
      ["river"],
    ])
  })
})
