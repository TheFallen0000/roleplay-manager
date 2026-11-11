import { describe, it, expect, vi } from "vitest"

import { CreateCharacterUseCase } from "./create-character.use-case"

let savedVersion: unknown = null

const buildRepo = () => ({
  createWithFirstVersion: vi.fn(async (c, v) => {
    savedVersion = v
    return { character: c, version: v }
  }),
  findById: async () => null,
  list: async () => [],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async () => null,
  findVersionsByCharacterId: async () => [],
  findMaxVersionNumber: async () => 0,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const lorebookVersionRepository = (found = true) => ({
  findVersionById: vi.fn(async () => (found ? { id: "lv-1" } : null)),
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

const linkedId = (): unknown =>
  savedVersion
    ? (savedVersion as Record<string, unknown>).lorebookVersionId
    : null

describe("CreateCharacterUseCase", () => {
  it("crea un personaje con version 1 y retorna CharacterDetail", async () => {
    const useCase = new CreateCharacterUseCase(buildRepo())

    const result = await useCase.execute({
      name: "Test Character",
      subtitle: "A test",
      profileImageAssetId: null,
      description: "A test character",
      greeting: "Hello!",
      cards: [
        { title: "Card 1", content: "Content 1" },
        { title: "Card 2", content: "Content 2", active: false },
      ],
    })

    expect(result.name).toBe("Test Character")
    expect(result.currentVersion.versionNumber).toBe(1)
    expect(result.currentVersion.cards).toHaveLength(2)
    expect(result.currentVersion.cards[0].title).toBe("Card 1")
    expect(result.currentVersion.cards[0].position).toBe(0)
    expect(result.currentVersion.cards[1].active).toBe(false)
  })

  it("crea con valores minimos (sin cards, sin subtitle)", async () => {
    const useCase = new CreateCharacterUseCase(buildRepo())

    const result = await useCase.execute({
      name: "Minimal",
      profileImageAssetId: null,
      description: "Desc",
      greeting: "Hi",
    })

    expect(result.currentVersion.subtitle).toBeNull()
    expect(result.currentVersion.cards).toHaveLength(0)
  })

  it("rechaza cards con titulo vacio", async () => {
    const useCase = new CreateCharacterUseCase(buildRepo())

    await expect(
      useCase.execute({
        name: "Bad",
        profileImageAssetId: null,
        description: "Desc",
        greeting: "Hi",
        cards: [{ title: "", content: "something" }],
      }),
    ).rejects.toThrow("Cards must have non-empty title and content")
  })

  it("links a lorebook version when provided", async () => {
    savedVersion = null
    const repository = buildRepo()
    const lorebooks = lorebookVersionRepository(true)
    const useCase = new CreateCharacterUseCase(repository, lorebooks as never)

    const result = await useCase.execute({
      name: "Linked",
      profileImageAssetId: null,
      description: "Desc",
      greeting: "Hi",
      lorebookVersionId: "lv-1",
    })

    expect(lorebooks.findVersionById).toHaveBeenCalledWith("lv-1")
    expect(linkedId()).toBe("lv-1")
    expect(result.currentVersion.versionNumber).toBe(1)
  })

  it("rejects an unknown lorebook version with LOREBOOK_VERSION_NOT_FOUND", async () => {
    savedVersion = null
    const repository = buildRepo()
    const useCase = new CreateCharacterUseCase(
      repository,
      lorebookVersionRepository(false) as never,
    )

    await expect(
      useCase.execute({
        name: "Linked",
        profileImageAssetId: null,
        description: "Desc",
        greeting: "Hi",
        lorebookVersionId: "missing",
      }),
    ).rejects.toMatchObject({ code: "LOREBOOK_VERSION_NOT_FOUND" })
    expect(repository.createWithFirstVersion).not.toHaveBeenCalled()
  })
})
