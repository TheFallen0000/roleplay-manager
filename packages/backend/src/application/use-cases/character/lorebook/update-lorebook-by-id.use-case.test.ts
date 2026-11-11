import { describe, expect, it, vi } from "vitest"

import { UpdateLorebookByIdUseCase } from "./update-lorebook-by-id.use-case"

const now = new Date("2026-11-11T12:00:00.000Z")

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
  currentVersionId: "version-1",
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
}

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  lorebookId: "book-1",
  name: "Dragon lore",
  sourceId: "1",
  keys: ["dragon"],
  secondaryKeys: [],
  comment: "Dragon lore",
  content: "Dragons dwell in the northern mountains.",
  constant: false,
  selective: false,
  selectiveLogic: 0 as const,
  insertionOrder: 100,
  position: "after_char" as const,
  rawPosition: "1",
  priority: 0,
  enabled: true,
  caseSensitive: false,
  wholeWords: false,
  order: 0,
  extensions: {},
  unknownFields: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
})

const buildRepository = (createdNewVersion: boolean) => ({
  findById: vi.fn(async () => ({
    book,
    entries: [
      entry(),
      entry({
        id: "entry-2",
        name: "River lore",
        sourceId: "2",
        keys: ["river"],
        content: "The river is old.",
        order: 1,
        rawPosition: "2",
      }),
    ],
  })),
  findVersionById: vi.fn(async () => null),
  findVersions: vi.fn(async () => []),
  list: vi.fn(async () => []),
  findByCharacterId: vi.fn(async () => null),
  createContainerWithVersion: vi.fn(async () => ({})),
  saveLiveHeadAndVersion: vi.fn(async (savedBook, entries, version) => ({
    book: savedBook,
    entries,
    version,
    createdNewVersion,
  })),
  upsertBook: vi.fn(async (value) => value),
  createEntry: vi.fn(async (value) => value),
  updateEntry: vi.fn(async (value) => value),
  deleteEntry: vi.fn(async () => {}),
  reorderEntries: vi.fn(async () => {}),
  replaceBook: vi.fn(async () => {}),
})

describe("UpdateLorebookByIdUseCase", () => {
  it("returns createdNewVersion false for an identical save instead of throwing", async () => {
    const repository = buildRepository(false)
    const useCase = new UpdateLorebookByIdUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({ id: "book-1" })

    expect(result.createdNewVersion).toBe(false)
    expect(result.lorebook.id).toBe("book-1")
    expect(repository.findByCharacterId).not.toHaveBeenCalled()
  })

  it("creates a new version when settings change", async () => {
    const repository = buildRepository(true)
    const useCase = new UpdateLorebookByIdUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({
      id: "book-1",
      name: "Renamed lore",
      scanDepth: 8,
      tokenBudget: 900,
      recursiveScanning: true,
    })

    expect(result.createdNewVersion).toBe(true)
    expect(repository.saveLiveHeadAndVersion).toHaveBeenCalledTimes(1)
    expect(repository.findByCharacterId).not.toHaveBeenCalled()
  })

  it("passes reordered entries to the repository so the source key changes", async () => {
    const repository = buildRepository(true)
    const useCase = new UpdateLorebookByIdUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({
      id: "book-1",
      entries: [
        {
          keys: ["river"],
          content: "The river is old.",
          name: "River lore",
        },
        {
          keys: ["dragon"],
          content: "Dragons dwell in the northern mountains.",
          name: "Dragon lore",
        },
      ],
    })

    expect(result.createdNewVersion).toBe(true)
    const call = repository.saveLiveHeadAndVersion.mock.calls[0] as [
      unknown,
      Array<Record<string, unknown>>,
    ]
    expect(call[1].map((item) => item.keys)).toEqual([
      ["river"],
      ["dragon"],
    ])
    expect(call[1].map((item) => item.order)).toEqual([0, 1])
  })
})
