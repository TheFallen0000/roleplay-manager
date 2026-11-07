import { describe, expect, it, vi } from "vitest"

import { CreateCharacterUseCase } from "./create-character.use-case"
import { buildLorebookCCv3 } from "../../../test-utils/sillytavern-fixtures"

const buildRepos = () => ({
  characterRepository: {
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
  },
  lorebookRepository: {
    findByCharacterId: vi.fn(async () => null),
    upsertBook: vi.fn(async (book) => book),
    createEntry: vi.fn(async (entry) => entry),
    updateEntry: vi.fn(async (entry) => entry),
    deleteEntry: vi.fn(async () => {}),
    reorderEntries: vi.fn(async () => {}),
    replaceBook: vi.fn(async () => {}),
  },
})

const buildUseCase = (repos = buildRepos()) =>
  new CreateCharacterUseCase(
    repos.characterRepository as never,
    repos.lorebookRepository as never
  )

describe("CreateCharacterUseCase — standalone lorebook", () => {
  it("creates the character, version and lorebook in the same use case", async () => {
    const repos = buildRepos()
    const payload = JSON.stringify(
      buildLorebookCCv3([{ keys: ["dragon"], content: "Dragons breathe fire." }])
    )

    const result = await buildUseCase(repos).execute({
      name: "Lyra",
      description: "A guardian of the forest.",
      greeting: "Hello!",
      lorebook: { format: "ccv3", payload },
    } as never)

    expect(result.name).toBe("Lyra")
    expect(repos.characterRepository.createWithFirstVersion).toHaveBeenCalledTimes(
      1
    )

    const [character, , lorebookArg] = (
      repos.characterRepository.createWithFirstVersion as ReturnType<typeof vi.fn>
    ).mock.calls[0]
    expect(lorebookArg.book).toMatchObject({
      characterId: character.id,
      name: "Forest lore",
    })
    expect(lorebookArg.entries).toHaveLength(1)
    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
  })

  it("does not create a lorebook when the input has none", async () => {
    const repos = buildRepos()

    await buildUseCase(repos).execute({
      name: "Lyra",
      description: "A guardian of the forest.",
      greeting: "Hello!",
    })

    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
  })
})
