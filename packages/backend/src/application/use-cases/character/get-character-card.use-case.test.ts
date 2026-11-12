import { describe, expect, it, vi } from "vitest"

import { GetCharacterCardUseCase } from "./get-character-card.use-case"

const now = new Date("2026-11-11T12:00:00.000Z")

const character = { id: "char-1", name: "Lyra", createdAt: now, updatedAt: now }

const characterVersion = (overrides: Record<string, unknown> = {}) => ({
  id: "ver-1",
  characterId: "char-1",
  name: "Lyra",
  subtitle: "Guardian",
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: null,
  greeting: "Hello, traveler.",
  versionNumber: 3,
  createdAt: now,
  cards: [],
  tagline: "The forest's guardian",
  extensions: { rm: { tagline: "The forest's guardian" } },
  unknownFields: null,
  unknownRootFields: { custom_root_key: true },
  lorebookVersionId: "version-1",
  ...overrides,
})

const lorebookVersion = (overrides: Record<string, unknown> = {}) => ({
  id: "version-1",
  lorebookId: "book-1",
  versionNumber: 2,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  entriesJson: JSON.stringify([
    {
      id: "entry-1",
      name: "Dragon lore",
      sourceId: "1",
      keys: ["dragon"],
      secondaryKeys: [],
      comment: "Dragon lore",
      content: "Linked v1 dragon lore.",
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
  ]),
  sourceKey: "a".repeat(64),
  createdAt: now,
  ...overrides,
})

const buildDeps = (options: {
  currentVersion?: Record<string, unknown> | null
  selectedVersion?: Record<string, unknown> | null
  version?: Record<string, unknown> | null
  liveBook?: unknown
} = {}) => {
  const characterRepository = {
    findById: vi.fn(async () =>
      options.currentVersion === null
        ? null
        : {
            character,
            currentVersion: options.currentVersion ?? characterVersion(),
          },
    ),
    findVersionById: vi.fn(async () => options.selectedVersion ?? null),
  }
  const lorebookRepository = {
    findVersionById: vi.fn(async () => options.version ?? null),
    findByCharacterId: vi.fn(async () => options.liveBook ?? null),
  }
  return { characterRepository, lorebookRepository }
}

describe("GetCharacterCardUseCase — linked lorebook version", () => {
  it("builds character_book from the linked version, not the live book", async () => {
    const deps = buildDeps({
      version: lorebookVersion(),
      liveBook: {
        book: { id: "book-1", name: "Live lore" },
        entries: [{ id: "live", content: "Live dragon lore." }],
      },
    })
    const useCase = new GetCharacterCardUseCase(deps as never)

    const result = await useCase.execute({ characterId: "char-1", spec: "v3" })

    expect(deps.lorebookRepository.findVersionById).toHaveBeenCalledWith(
      "version-1",
    )
    expect(deps.lorebookRepository.findByCharacterId).not.toHaveBeenCalled()

    expect(result.spec).toBe("chara_card_v3")
    expect(result.data.character_book).toMatchObject({
      name: "Forest lore",
      scan_depth: 4,
      token_budget: 400,
    })
    const book = result.data.character_book as Record<string, unknown>
    const entries = book.entries as Array<Record<string, unknown>>
    expect(entries[0].content).toBe("Linked v1 dragon lore.")
    expect(result.data.extensions).toMatchObject({
      rm: {
        version: 1,
        tagline: "The forest's guardian",
        versionNumber: 3,
        lorebook: {
          lorebookId: "book-1",
          lorebookVersionId: "version-1",
          versionNumber: 2,
          sourceKey: "a".repeat(64),
        },
      },
    })
    expect(result).toEqual(
      expect.objectContaining({ custom_root_key: true }),
    )
  })

  it("exports the requested character version with its own lorebook version", async () => {
    const deps = buildDeps({
      currentVersion: characterVersion({ id: "ver-current", lorebookVersionId: "version-current" }),
      selectedVersion: characterVersion({ id: "ver-old", lorebookVersionId: "version-old" }),
      version: lorebookVersion({
        id: "version-old",
        versionNumber: 1,
        entriesJson: JSON.stringify([{ id: "old", content: "Old dragon lore." }]),
      }),
    })
    const useCase = new GetCharacterCardUseCase(deps as never)

    const result = await useCase.execute({
      characterId: "char-1",
      spec: "v3",
      versionId: "ver-old",
    })

    expect(deps.characterRepository.findVersionById).toHaveBeenCalledWith(
      "ver-old",
    )
    expect(deps.lorebookRepository.findVersionById).toHaveBeenCalledWith(
      "version-old",
    )
    expect(result.data.character_book).toMatchObject({
      entries: [expect.objectContaining({ content: "Old dragon lore." })],
    })
  })

  it("omits character_book when the character version has no lorebook", async () => {
    const deps = buildDeps({
      currentVersion: characterVersion({ lorebookVersionId: null }),
    })
    const useCase = new GetCharacterCardUseCase(deps as never)

    const result = await useCase.execute({ characterId: "char-1", spec: "v3" })

    expect(deps.lorebookRepository.findVersionById).not.toHaveBeenCalled()
    expect(result.data).not.toHaveProperty("character_book")
    expect(result.data.extensions).toMatchObject({
      rm: { version: 1, versionNumber: 3 },
    })
  })
})
