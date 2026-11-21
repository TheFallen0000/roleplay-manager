import { describe, expect, it, vi } from "vitest"

import { ListLorebooksUseCase } from "./list-lorebooks.use-case"

const now = new Date("2026-11-20T12:00:00.000Z")

const summary = (id: string) => ({
  book: {
    id,
    characterId: null,
    name: id,
    description: null,
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    extensions: null,
    unknownFields: null,
    originId: null,
    currentVersionId: `${id}-v1`,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  currentVersionNumber: 1,
  entryCount: 1,
  description: null,
  usageCount: 2,
  usageVersionCount: 5,
})

const buildRepository = () => ({
  listSummaries: vi.fn(async () => [
    summary("book-a"),
    summary("book-b"),
    summary("book-c"),
  ]),
})

describe("ListLorebooksUseCase — SQL pagination and filters (N4)", () => {
  it("pushes limit, offset and filter to the repository", async () => {
    const repository = buildRepository()
    const useCase = new ListLorebooksUseCase({
      lorebookRepository: repository,
    } as never)

    await useCase.execute({ limit: 1, offset: 1, filter: "in-use" })

    expect(repository.listSummaries).toHaveBeenCalledWith({
      limit: 1,
      offset: 1,
      filter: "in-use",
    })
  })

  it("maps every repository row without slicing in memory", async () => {
    const repository = buildRepository()
    const useCase = new ListLorebooksUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({ limit: 1 })

    expect(result).toHaveLength(3)
    expect(result.map((item) => item.id)).toEqual([
      "book-a",
      "book-b",
      "book-c",
    ])
  })

  it("exposes the real usageVersionCount", async () => {
    const repository = buildRepository()
    const useCase = new ListLorebooksUseCase({
      lorebookRepository: repository,
    } as never)

    const [first] = await useCase.execute()

    expect(first).toMatchObject({ usageCount: 2, usageVersionCount: 5 })
  })
})
