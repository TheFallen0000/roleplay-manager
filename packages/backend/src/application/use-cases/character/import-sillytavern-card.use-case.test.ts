import { describe, expect, it, vi } from "vitest"

import { ImportSillyTavernCardUseCase } from "./import-sillytavern-card.use-case"
import { buildCardPngFixture } from "../../../test-utils/png-fixtures"
import {
  buildCardWithUnknownFields,
  buildV1Card,
  buildV3Card,
} from "../../../test-utils/sillytavern-fixtures"

const now = new Date("2026-11-07T12:00:00.000Z")

const buildRepos = () => {
  const characterRepository = {
    createWithFirstVersion: vi.fn(async (character, version) => ({
      character,
      version,
    })),
    findById: vi.fn(async () => null),
    list: vi.fn(async () => []),
    update: vi.fn(async (character) => character),
    delete: vi.fn(async () => {}),
    findVersionById: vi.fn(async () => null),
    findVersionsByCharacterId: vi.fn(async () => []),
    findMaxVersionNumber: vi.fn(async () => 0),
    saveVersion: vi.fn(async (version) => version),
    updateProfileImageAssetId: vi.fn(async () => {}),
  }

  const lorebookRepository = {
    findByCharacterId: vi.fn(async () => null),
    upsertBook: vi.fn(async (book) => book),
    createEntry: vi.fn(async (entry) => entry),
    updateEntry: vi.fn(async (entry) => entry),
    deleteEntry: vi.fn(async () => {}),
    reorderEntries: vi.fn(async () => {}),
    replaceBook: vi.fn(async () => {}),
  }

  const storeCharacterAsset = {
    store: vi.fn(async () => ({
      id: "asset-1",
      characterId: "char-1",
      mimeType: "image/png",
      sizeBytes: 1,
      extension: "png",
      width: 1,
      height: 1,
      createdAt: now,
    })),
  }

  return { characterRepository, lorebookRepository, storeCharacterAsset }
}

const buildUseCase = (repos = buildRepos()) =>
  new ImportSillyTavernCardUseCase(repos as never)

const capture = async (promise: Promise<unknown>): Promise<{ code?: string } | null> => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { code?: string }
  }
}

describe("ImportSillyTavernCardUseCase", () => {
  it("imports a V3 JSON card with its embedded lorebook", async () => {
    const repos = buildRepos()
    const useCase = buildUseCase(repos)

    const result = await useCase.execute({
      format: "json",
      payload: JSON.stringify(buildV3Card()),
    })

    expect(result.name).toBe("Lyra")
    expect(repos.characterRepository.createWithFirstVersion).toHaveBeenCalledTimes(
      1
    )

    const [character, version] = (
      repos.characterRepository.createWithFirstVersion as ReturnType<typeof vi.fn>
    ).mock.calls[0]
    expect(character.name).toBe("Lyra")
    expect(version).toMatchObject({
      characterId: character.id,
      name: "Lyra",
      personality: "Brave and kind.",
      scenario: "An ancient forest.",
      systemPrompt: "You are Lyra.",
      postHistoryInstructions: "Stay in character.",
      creatorNotes: "Never sent to the model.",
      tags: ["fantasy", "guardian"],
      creator: "Card Author",
      cardCharacterVersion: "1.2.0",
    })

    const writeBook = repos.lorebookRepository.replaceBook.mock.calls[0] ?? []
    expect(writeBook[0]).toMatchObject({
      characterId: character.id,
      name: "Forest lore",
      scanDepth: 4,
      tokenBudget: 400,
    })
    expect(writeBook[1]).toHaveLength(1)
  })

  it("imports a V1 JSON card (import-only) with unknown root fields", async () => {
    const repos = buildRepos()

    await buildUseCase(repos).execute({
      format: "json",
      payload: JSON.stringify(
        buildV1Card({ name: "V1 Lyra", custom_root: { nested: true } })
      ),
    })

    const [, version] = (
      repos.characterRepository.createWithFirstVersion as ReturnType<typeof vi.fn>
    ).mock.calls[0]
    expect(version.name).toBe("V1 Lyra")
    expect(version.personality).toBe("Brave and kind.")
    expect(version.unknownRootFields).toEqual({ custom_root: { nested: true } })
    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
  })

  it("imports a PNG card from its base64 payload", async () => {
    const repos = buildRepos()
    const png = buildCardPngFixture({
      chara: JSON.stringify(buildV3Card()),
      ccv3: JSON.stringify(buildV3Card({ name: "Png Lyra" })),
    })

    const result = await buildUseCase(repos).execute({
      format: "png",
      payload: png.toString("base64"),
    })

    expect(result.name).toBe("Png Lyra")
    expect(repos.characterRepository.createWithFirstVersion).toHaveBeenCalledTimes(
      1
    )
  })

  it("rejects an empty name with INVALID_CARD_NAME", async () => {
    const repos = buildRepos()

    const error = await capture(
      buildUseCase(repos).execute({
        format: "json",
        payload: JSON.stringify(buildV3Card({ name: "   " })),
      })
    )

    expect(error).toMatchObject({ code: "INVALID_CARD_NAME" })
    expect(repos.characterRepository.createWithFirstVersion).not.toHaveBeenCalled()
  })

  it("rejects a prompt field over MAX_PROMPT_FIELD_CHARS", async () => {
    const repos = buildRepos()

    const error = await capture(
      buildUseCase(repos).execute({
        format: "json",
        payload: JSON.stringify(
          buildV3Card({ system_prompt: "x".repeat(20_001) })
        ),
      })
    )

    expect(error).toMatchObject({ code: "INVALID_CARD_FIELD_TOO_LARGE" })
    expect(repos.characterRepository.createWithFirstVersion).not.toHaveBeenCalled()
  })

  it("preserves the unknown buckets separately", async () => {
    const repos = buildRepos()
    const card = buildCardWithUnknownFields()

    await buildUseCase(repos).execute({
      format: "json",
      payload: JSON.stringify(card),
    })

    const [, version] = (
      repos.characterRepository.createWithFirstVersion as ReturnType<typeof vi.fn>
    ).mock.calls[0]
    expect(version.unknownFields).toMatchObject({
      assets: card.data.assets,
      nickname: "The Guardian",
      group_only_greetings: ["Group hello"],
    })
    expect(version.unknownRootFields).toEqual({
      custom_root_key: { nested: true },
    })
    expect(version.extensions).toEqual(card.data.extensions)
  })
})
