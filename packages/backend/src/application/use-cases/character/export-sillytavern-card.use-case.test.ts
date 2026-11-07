import { Readable } from "node:stream"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ExportSillyTavernCardUseCase } from "./export-sillytavern-card.use-case"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { readTextChunks } from "../../../test-utils/png-fixtures"

const now = new Date("2026-11-07T12:00:00.000Z")

const character = Character.create({
  id: "char-1",
  name: "Lyra",
  createdAt: now,
  updatedAt: now,
})

const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Lyra",
  subtitle: "Guardian",
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: null,
  greeting: "Hello, traveler.",
  versionNumber: 1,
  createdAt: now,
  cards: [],
  personality: "Brave and kind.",
  scenario: "An ancient forest.",
  mesExample: "<START>\n{{char}}: Welcome.",
  alternateGreetings: ["Greetings, traveler."],
  creatorNotes: "Never sent to the model.",
  tags: ["fantasy"],
  creator: "Card Author",
  cardCharacterVersion: "1.2.0",
  gender: "female",
  pronouns: "she/her",
  tagline: "The forest's guardian",
  systemPrompt: "You are Lyra.",
  postHistoryInstructions: "Stay in character.",
  extensions: { rm: { other: 1 } },
  unknownFields: { assets: [{ type: "icon" }], nickname: "The Guardian" },
  unknownRootFields: { custom_root_key: true },
} as never)

const lorebook = {
  id: "book-1",
  characterId: "char-1",
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: { source: "import" },
  unknownFields: null,
  entries: [
    {
      id: "entry-1",
      name: "Dragon lore",
      sourceId: "7",
      keys: ["dragon"],
      secondaryKeys: [],
      comment: "Dragon lore",
      content: "Dragons breathe fire.",
      constant: false,
      selective: false,
      selectiveLogic: 0,
      insertionOrder: 42,
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
  ],
}

const buildRepos = () => ({
  characterRepository: {
    createWithFirstVersion: vi.fn(),
    findById: vi.fn(async () => ({ character, currentVersion: version })),
    list: vi.fn(async () => [character]),
    update: vi.fn(),
    delete: vi.fn(),
    findVersionById: vi.fn(async () => version),
    findVersionsByCharacterId: vi.fn(async () => [version]),
    findMaxVersionNumber: vi.fn(async () => 1),
    saveVersion: vi.fn(),
    updateProfileImageAssetId: vi.fn(),
  },
  lorebookRepository: {
    findByCharacterId: vi.fn(async () => ({ book: lorebook, entries: lorebook.entries })),
    upsertBook: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    reorderEntries: vi.fn(),
    replaceBook: vi.fn(),
  },
  assetRepository: {
    create: vi.fn(),
    findById: vi.fn(async () => null),
    findByCharacterId: vi.fn(async () => []),
    deleteById: vi.fn(),
  },
  assetStorage: {
    write: vi.fn(),
    read: vi.fn(async () => Readable.from([Buffer.from("image")])),
    delete: vi.fn(),
  },
})

const buildUseCase = (repos = buildRepos()) =>
  new ExportSillyTavernCardUseCase(repos as never)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ExportSillyTavernCardUseCase — JSON", () => {
  it("exports a V3 card with the embedded lorebook", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      format: "json",
      spec: "v3",
    })

    expect(result.format).toBe("json")
    if (result.format !== "json") return

    const body = result.body as Record<string, unknown>
    expect(body.spec).toBe("chara_card_v3")
    expect(body.custom_root_key).toBe(true)
    expect(body.data).toMatchObject({
      name: "Lyra",
      description: "A guardian of the forest.",
      personality: "Brave and kind.",
      scenario: "An ancient forest.",
      first_mes: "Hello, traveler.",
      mes_example: "<START>\n{{char}}: Welcome.",
      system_prompt: "You are Lyra.",
      post_history_instructions: "Stay in character.",
      alternate_greetings: ["Greetings, traveler."],
      creator_notes: "Never sent to the model.",
      tags: ["fantasy"],
      creator: "Card Author",
      character_version: "1.2.0",
      gender: "female",
      pronouns: "she/her",
    })
    const data = body.data as Record<string, unknown>
    expect(data.character_book).toMatchObject({
      name: "Forest lore",
      entries: [expect.objectContaining({ content: "Dragons breathe fire." })],
    })
  })

  it("exports a V2 card without V3-only data keys", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      format: "json",
      spec: "v2",
    })

    expect(result.format).toBe("json")
    if (result.format !== "json") return

    const body = result.body as Record<string, unknown>
    const data = body.data as Record<string, unknown>
    expect(body.spec).toBe("chara_card_v2")
    expect(data).not.toHaveProperty("assets")
    expect(data).not.toHaveProperty("nickname")
    expect(data).not.toHaveProperty("group_only_greetings")
    expect(data).not.toHaveProperty("source")
  })
})

describe("ExportSillyTavernCardUseCase — PNG", () => {
  it("writes both chunks when exporting V3: ccv3 full, chara V2 projection", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      format: "png",
      spec: "v3",
    })

    expect(result.format).toBe("png")
    if (result.format !== "png") return

    expect(result.body.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )

    const chunks = readTextChunks(result.body)
    const chara = JSON.parse(
      chunks.find((chunk) => chunk.keyword === "chara")!.payload
    ) as Record<string, unknown>
    const ccv3 = JSON.parse(
      chunks.find((chunk) => chunk.keyword === "ccv3")!.payload
    ) as Record<string, unknown>

    expect(ccv3.spec).toBe("chara_card_v3")
    expect(chara.spec).toBe("chara_card_v2")
    expect((chara.data as Record<string, unknown>).assets).toBeUndefined()
  })

  it("writes chara V2 and ccv3 V3 when exporting V2", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      format: "png",
      spec: "v2",
    })

    if (result.format !== "png") return
    const chunks = readTextChunks(result.body)
    const chara = JSON.parse(
      chunks.find((chunk) => chunk.keyword === "chara")!.payload
    ) as Record<string, unknown>
    const ccv3 = JSON.parse(
      chunks.find((chunk) => chunk.keyword === "ccv3")!.payload
    ) as Record<string, unknown>

    expect(chara.spec).toBe("chara_card_v2")
    expect(ccv3.spec).toBe("chara_card_v3")
  })

  it("generates the placeholder in memory with zero network calls", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const result = await buildUseCase().execute({
      characterId: "char-1",
      format: "png",
      spec: "v3",
    })

    expect(result.format).toBe("png")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("never exports settings, providers or API keys", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      format: "json",
      spec: "v3",
    })

    if (result.format !== "json") return
    const serialized = JSON.stringify(result.body)
    expect(serialized).not.toContain("apiKey")
    expect(serialized).not.toContain("providerInstance")
    expect(serialized).not.toContain("baseUrl")
  })
})
