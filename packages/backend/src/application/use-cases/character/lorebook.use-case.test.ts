import { describe, expect, it, vi } from "vitest"

import { MAX_LOREBOOK_ENTRIES } from "@workspace/shared/lib/sillytavern-card"

import { ImportLorebookUseCase } from "./lorebook/import-lorebook.use-case"
import { ExportLorebookUseCase } from "./lorebook/export-lorebook.use-case"
import { GetLorebookUseCase } from "./lorebook/get-lorebook.use-case"
import { UpdateLorebookUseCase } from "./lorebook/update-lorebook.use-case"
import { CreateLorebookEntryUseCase } from "./lorebook/create-lorebook-entry.use-case"
import { UpdateLorebookEntryUseCase } from "./lorebook/update-lorebook-entry.use-case"
import { DeleteLorebookEntryUseCase } from "./lorebook/delete-lorebook-entry.use-case"
import { ReorderLorebookEntriesUseCase } from "./lorebook/reorder-lorebook-entries.use-case"
import {
  buildLorebookCCv3,
  buildLorebookStNativeArray,
} from "../../../test-utils/sillytavern-fixtures"

const now = new Date("2026-11-07T12:00:00.000Z")

const book = (overrides: Record<string, unknown> = {}) => ({
  id: "book-1",
  characterId: "char-1",
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
})

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  lorebookId: "book-1",
  name: "Dragon lore",
  sourceId: "7",
  keys: ["dragon"],
  secondaryKeys: [],
  comment: "Dragon lore",
  content: "Dragons breathe fire.",
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

const buildRepos = (existing: { book: unknown; entries: unknown[] } | null = null) => ({
  lorebookRepository: {
    findByCharacterId: vi.fn(async () => existing),
    upsertBook: vi.fn(async (value) => value),
    createEntry: vi.fn(async (value) => value),
    updateEntry: vi.fn(async (value) => value),
    deleteEntry: vi.fn(async () => {}),
    reorderEntries: vi.fn(async () => {}),
    replaceBook: vi.fn(async () => {}),
  },
})

const capture = async (promise: Promise<unknown>): Promise<{ code?: string } | null> => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { code?: string }
  }
}

describe("lorebook use cases — import", () => {
  it("rejects importing over an existing book without replace", async () => {
    const repos = buildRepos({ book: book(), entries: [entry()] })
    const useCase = new ImportLorebookUseCase(repos as never)

    const error = await capture(
      useCase.execute({
        characterId: "char-1",
        format: "ccv3",
        payload: JSON.stringify(buildLorebookCCv3()),
      })
    )

    expect(error).toMatchObject({ code: "LOREBOOK_ALREADY_EXISTS" })
    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
  })

  it("replaces the book and entries when replace is true", async () => {
    const repos = buildRepos({ book: book(), entries: [entry()] })
    const useCase = new ImportLorebookUseCase(repos as never)

    const result = await useCase.execute({
      characterId: "char-1",
      format: "ccv3",
      payload: JSON.stringify(buildLorebookCCv3()),
      replace: true,
    })

    expect(result).toMatchObject({ characterId: "char-1", name: "Forest lore" })
    expect(repos.lorebookRepository.replaceBook).toHaveBeenCalledTimes(1)
  })

  it("rejects more than MAX_LOREBOOK_ENTRIES entries", async () => {
    const repos = buildRepos(null)
    const useCase = new ImportLorebookUseCase(repos as never)
    const entries = Array.from({ length: MAX_LOREBOOK_ENTRIES + 1 }, (_, index) => ({
      keys: [`key-${index}`],
      content: `Content ${index}`,
    }))

    const error = await capture(
      useCase.execute({
        characterId: "char-1",
        format: "ccv3",
        payload: JSON.stringify(buildLorebookCCv3(entries)),
      })
    )

    expect(error).not.toBeNull()
    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
  })

  it("imports ST native object and array containers", async () => {
    const repos = buildRepos(null)
    const useCase = new ImportLorebookUseCase(repos as never)

    await useCase.execute({
      characterId: "char-1",
      format: "st-native",
      payload: JSON.stringify(buildLorebookStNativeArray()),
    })

    expect(repos.lorebookRepository.replaceBook).toHaveBeenCalledTimes(1)
  })
})

describe("lorebook use cases — export", () => {
  it("exports CCv3 with the standalone spec and no spec_version", async () => {
    const repos = buildRepos({ book: book(), entries: [entry()] })
    const useCase = new ExportLorebookUseCase(repos as never)

    const result = await useCase.execute({
      characterId: "char-1",
      format: "ccv3",
    })

    expect(result).toMatchObject({ spec: "lorebook_v3" })
    expect(result).not.toHaveProperty("spec_version")
    expect(result.data).toMatchObject({
      name: "Forest lore",
      scan_depth: 4,
      token_budget: 400,
      entries: [expect.objectContaining({ keys: ["dragon"] })],
    })
  })

  it("exports ST native keyed by source id", async () => {
    const repos = buildRepos({ book: book(), entries: [entry()] })
    const useCase = new ExportLorebookUseCase(repos as never)

    const result = await useCase.execute({
      characterId: "char-1",
      format: "st-native",
    })

    expect(result.entries).toHaveProperty("7")
    expect(result.entries["7"]).toMatchObject({
      key: ["dragon"],
      content: "Dragons breathe fire.",
      disable: false,
      position: 1,
    })
  })
})

describe("lorebook use cases — get, update and CRUD", () => {
  it("throws LOREBOOK_NOT_FOUND when the character has no book", async () => {
    const repos = buildRepos(null)
    const useCase = new GetLorebookUseCase(repos as never)

    const error = await capture(useCase.execute({ characterId: "char-1" }))
    expect(error).toMatchObject({ code: "LOREBOOK_NOT_FOUND" })
  })

  it("returns the book and entries when it exists", async () => {
    const repos = buildRepos({ book: book(), entries: [entry()] })
    const useCase = new GetLorebookUseCase(repos as never)

    const result = await useCase.execute({ characterId: "char-1" })
    expect(result).toMatchObject({
      id: "book-1",
      characterId: "char-1",
      entries: [expect.objectContaining({ id: "entry-1" })],
    })
  })

  it("upserts book settings", async () => {
    const repos = buildRepos(null)
    const useCase = new UpdateLorebookUseCase(repos as never)

    await useCase.execute({
      characterId: "char-1",
      name: "New name",
      scanDepth: 8,
      tokenBudget: 600,
      recursiveScanning: true,
    })

    expect(repos.lorebookRepository.upsertBook).toHaveBeenCalledWith(
      expect.objectContaining({
        characterId: "char-1",
        name: "New name",
        scanDepth: 8,
        tokenBudget: 600,
        recursiveScanning: true,
      })
    )
  })

  it("creates, updates and deletes entries", async () => {
    const repos = buildRepos({ book: book(), entries: [entry()] })
    const create = new CreateLorebookEntryUseCase(repos as never)
    const update = new UpdateLorebookEntryUseCase(repos as never)
    const remove = new DeleteLorebookEntryUseCase(repos as never)

    await create.execute({
      characterId: "char-1",
      keys: ["forest"],
      content: "The forest is old.",
      position: "before_char",
      selectiveLogic: 0,
      insertionOrder: 10,
      priority: 5,
      enabled: true,
      caseSensitive: false,
      wholeWords: false,
    })
    await update.execute({
      characterId: "char-1",
      entryId: "entry-1",
      content: "Updated content.",
    })
    await remove.execute({ characterId: "char-1", entryId: "entry-1" })

    expect(repos.lorebookRepository.createEntry).toHaveBeenCalledTimes(1)
    expect(repos.lorebookRepository.updateEntry).toHaveBeenCalledTimes(1)
    expect(repos.lorebookRepository.deleteEntry).toHaveBeenCalledWith("entry-1")
  })

  it("reorders entries", async () => {
    const repos = buildRepos({ book: book(), entries: [entry()] })
    const useCase = new ReorderLorebookEntriesUseCase(repos as never)

    await useCase.execute({
      characterId: "char-1",
      entryIds: ["entry-2", "entry-1"],
    })

    expect(repos.lorebookRepository.reorderEntries).toHaveBeenCalledWith([
      "entry-2",
      "entry-1",
    ])
  })
})
