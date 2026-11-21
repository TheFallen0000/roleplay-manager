import { describe, expect, it, vi } from "vitest"

import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"
import {
  buildLorebookEntity,
  buildLorebookEntryEntity,
} from "../../../../test-utils/lorebook-fixtures"

import { ReorderLorebookEntriesUseCase } from "./reorder-lorebook-entries.use-case"

const buildRepository = () => {
  const findByCharacterId = vi.fn(async () => ({
    book: buildLorebookEntity({ id: "book-1" }),
    entries: [
      buildLorebookEntryEntity({ id: "entry-1", lorebookId: "book-1" }),
      buildLorebookEntryEntity({ id: "entry-2", lorebookId: "book-1" }),
    ],
  }))
  const reorderEntries = vi.fn(async () => {})

  return {
    repository: {
      findByCharacterId,
      reorderEntries,
    } as unknown as LorebookRepository,
    reorderEntries,
  }
}

describe("ReorderLorebookEntriesUseCase", () => {
  it("reorders the entries that belong to the book", async () => {
    const { repository, reorderEntries } = buildRepository()
    const useCase = new ReorderLorebookEntriesUseCase({
      lorebookRepository: repository,
    })

    await useCase.execute({
      characterId: "char-1",
      entryIds: ["entry-2", "entry-1"],
    })

    expect(reorderEntries).toHaveBeenCalledWith(["entry-2", "entry-1"])
  })

  it("rejects an entry that belongs to another book", async () => {
    const { repository, reorderEntries } = buildRepository()
    const useCase = new ReorderLorebookEntriesUseCase({
      lorebookRepository: repository,
    })

    await expect(
      useCase.execute({
        characterId: "char-1",
        entryIds: ["entry-2", "entry-x"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_LOREBOOK_ORDER" })
    expect(reorderEntries).not.toHaveBeenCalled()
  })

  it("rejects duplicated entry ids", async () => {
    const { repository, reorderEntries } = buildRepository()
    const useCase = new ReorderLorebookEntriesUseCase({
      lorebookRepository: repository,
    })

    await expect(
      useCase.execute({
        characterId: "char-1",
        entryIds: ["entry-1", "entry-1"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_LOREBOOK_ORDER" })
    expect(reorderEntries).not.toHaveBeenCalled()
  })
})
