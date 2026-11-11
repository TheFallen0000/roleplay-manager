import { describe, expect, it, vi } from "vitest"

import { translate } from "@workspace/shared/i18n"
import {
  MAX_LOREBOOK_ENTRIES,
  MAX_PROMPT_FIELD_CHARS,
} from "@workspace/shared/lib/sillytavern-card"

import {
  buildCardWithImportedLorebookIds,
  buildLorebookCCv3,
  buildV3Card,
} from "../../../test-utils/sillytavern-fixtures"
import { UpdateCharacterCardUseCase } from "./update-character-card.use-case"

const now = new Date("2026-11-11T12:00:00.000Z")

const character = { id: "char-1", name: "Lyra", createdAt: now, updatedAt: now }

const currentVersion = {
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
  unknownRootFields: null,
  lorebookVersionId: "version-1",
}

const buildDeps = () => {
  let savedVersion: Record<string, unknown> | null = null
  let createdBook: Record<string, unknown> | null = null
  let createdVersion: Record<string, unknown> | null = null
  let createdEntries: Array<Record<string, unknown>> = []

  const characterRepository = {
    findById: vi.fn(async () => ({ character, currentVersion })),
    findVersionById: vi.fn(async () => currentVersion),
    findVersionsByCharacterId: vi.fn(async () =>
      savedVersion ? [currentVersion, savedVersion] : [currentVersion],
    ),
    findMaxVersionNumber: vi.fn(async () => 3),
    update: vi.fn(async (value) => value),
    saveVersion: vi.fn(async (value) => {
      savedVersion = value as unknown as Record<string, unknown>
      return value
    }),
    createWithFirstVersion: vi.fn(),
    list: vi.fn(async () => []),
    delete: vi.fn(async () => {}),
    updateProfileImageAssetId: vi.fn(async () => {}),
  }

  const lorebookRepository = {
    createContainerWithVersion: vi.fn(
      async (book, entries, version) => {
        createdBook = book as unknown as Record<string, unknown>
        createdEntries = entries as Array<Record<string, unknown>>
        createdVersion = version as unknown as Record<string, unknown>
        return { book, entries, version }
      },
    ),
    findById: vi.fn(async () => null),
    findVersionById: vi.fn(async () => null),
    findVersions: vi.fn(async () => []),
    list: vi.fn(async () => []),
    findByCharacterId: vi.fn(async () => null),
    saveLiveHeadAndVersion: vi.fn(async () => ({})),
    upsertBook: vi.fn(async (book) => book),
    createEntry: vi.fn(async (entry) => entry),
    updateEntry: vi.fn(async (entry) => entry),
    deleteEntry: vi.fn(async () => {}),
    reorderEntries: vi.fn(async () => {}),
    replaceBook: vi.fn(async () => {}),
  }

  return {
    deps: { characterRepository, lorebookRepository },
    characterRepository,
    lorebookRepository,
    get savedVersion() {
      return savedVersion
    },
    get createdBook() {
      return createdBook
    },
    get createdVersion() {
      return createdVersion
    },
    get createdEntries() {
      return createdEntries
    },
  }
}

const capture = async (promise: Promise<unknown>): Promise<{ code?: string } | null> => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { code?: string }
  }
}

describe("UpdateCharacterCardUseCase — card PUT", () => {
  it("creates one character version and a new local lorebook with new ids", async () => {
    const harness = buildDeps()
    const useCase = new UpdateCharacterCardUseCase(harness.deps as never)
    const card = buildCardWithImportedLorebookIds()

    const result = await useCase.execute({
      characterId: "char-1",
      payload: card,
    })

    expect(harness.characterRepository.saveVersion).toHaveBeenCalledTimes(1)
    expect(harness.lorebookRepository.createContainerWithVersion).toHaveBeenCalledTimes(
      1,
    )
    expect(harness.lorebookRepository.findByCharacterId).not.toHaveBeenCalled()

    const book = harness.createdBook!
    const version = harness.createdVersion!
    expect(book.id).not.toBe("imported-book")
    expect(version.id).not.toBe("imported-version")
    expect(book.originId).toBe("imported-origin")
    expect(book.origin_id).toBeUndefined()
    expect(version.sourceKey).toMatch(/^[0-9a-f]{64}$/)
    expect(version.sourceKey).not.toBe("imported-source-key")
    expect(harness.createdEntries).toHaveLength(1)

    expect(harness.savedVersion?.lorebookVersionId).toBe(version.id)

    const data = result.data as Record<string, unknown>
    const extensions = data.extensions as Record<string, unknown>
    expect(extensions.rm).toMatchObject({
      version: 1,
      lorebook: {
        lorebookId: book.id,
        lorebookVersionId: version.id,
        versionNumber: 1,
        sourceKey: version.sourceKey,
        originId: "imported-origin",
      },
    })
    expect(data.character_book).toBeDefined()
  })

  it("ignores extensions.rm.lorebook when there is no character_book", async () => {
    const harness = buildDeps()
    const useCase = new UpdateCharacterCardUseCase(harness.deps as never)
    const card = buildV3Card({
      character_book: undefined,
      extensions: {
        rm: {
          version: 1,
          lorebook: {
            lorebookId: "imported-book",
            lorebookVersionId: "imported-version",
            versionNumber: 9,
            sourceKey: "imported-source-key",
          },
        },
      },
    })

    const result = await useCase.execute({
      characterId: "char-1",
      payload: card,
    })

    expect(harness.lorebookRepository.createContainerWithVersion).not.toHaveBeenCalled()
    expect(harness.savedVersion?.lorebookVersionId ?? null).toBeNull()
    expect(harness.characterRepository.saveVersion).toHaveBeenCalledTimes(1)
    expect(result.data).not.toHaveProperty("character_book")
  })

  it("rejects an empty name without creating a version", async () => {
    const harness = buildDeps()
    const useCase = new UpdateCharacterCardUseCase(harness.deps as never)

    const error = await capture(
      useCase.execute({
        characterId: "char-1",
        payload: buildV3Card({ name: "" }),
      }),
    )

    expect(error).toMatchObject({ code: "INVALID_CARD_NAME" })
    expect(harness.characterRepository.saveVersion).not.toHaveBeenCalled()
  })

  it("rejects a prompt field over the size cap without creating a version", async () => {
    const harness = buildDeps()
    const useCase = new UpdateCharacterCardUseCase(harness.deps as never)

    const error = await capture(
      useCase.execute({
        characterId: "char-1",
        payload: buildV3Card({
          system_prompt: "x".repeat(MAX_PROMPT_FIELD_CHARS + 1),
        }),
      }),
    )

    expect(error).toMatchObject({ code: "INVALID_CARD_FIELD_TOO_LARGE" })
    expect(harness.characterRepository.saveVersion).not.toHaveBeenCalled()
  })

  it("rejects more than MAX_LOREBOOK_ENTRIES entries", async () => {
    const harness = buildDeps()
    const useCase = new UpdateCharacterCardUseCase(harness.deps as never)
    const entries = Array.from({ length: MAX_LOREBOOK_ENTRIES + 1 }, (_, index) => ({
      keys: [`key-${index}`],
      content: `Content ${index}`,
    }))

    const error = await capture(
      useCase.execute({
        characterId: "char-1",
        payload: buildV3Card({ character_book: buildLorebookCCv3(entries).data }),
      }),
    )

    expect(error).not.toBeNull()
    expect(harness.characterRepository.saveVersion).not.toHaveBeenCalled()
  })

  it("uses the description and greeting fallbacks and saves once", async () => {
    const harness = buildDeps()
    const useCase = new UpdateCharacterCardUseCase(harness.deps as never)

    await useCase.execute({
      characterId: "char-1",
      payload: buildV3Card({
        description: "   ",
        first_mes: "",
        alternate_greetings: [],
      }),
    })

    expect(harness.characterRepository.saveVersion).toHaveBeenCalledTimes(1)
    expect(harness.savedVersion?.description).toBe(
      translate("en", "characters.cardFallbackDescription"),
    )
    expect(harness.savedVersion?.greeting).toBe(
      translate("en", "characters.cardFallbackGreeting"),
    )
  })
})
