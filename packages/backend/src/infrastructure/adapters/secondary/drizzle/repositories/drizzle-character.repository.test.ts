import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../../../config/database"
import { Character } from "../../../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../../../domain/entities/character-version.entity"
import { characterVersions, characters } from "../schema"
import { DrizzleCharacterRepository } from "./drizzle-character.repository"

const root = mkdtempSync(join(tmpdir(), "rm-character-repository-s132-"))
const db = buildDatabase(join(root, "test.db"))
const client = (db as unknown as { $client: { close: () => void } }).$client
const now = new Date("2026-11-07T12:00:00.000Z")

const field = (version: CharacterVersion, key: string): unknown =>
  (version as unknown as Record<string, unknown>)[key]

const character = Character.create({
  id: "char-s132",
  name: "Lyra",
  createdAt: now,
  updatedAt: now,
})

const cardVersion = CharacterVersion.create({
  id: "ver-s132",
  characterId: "char-s132",
  name: "Lyra",
  subtitle: "Guardian",
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: "Native instructions.",
  greeting: "Hello, traveler.",
  versionNumber: 1,
  createdAt: now,
  cards: [],
  personality: "Brave and kind.",
  scenario: "An ancient forest.",
  mesExample: "<START>\n{{char}}: Welcome.",
  alternateGreetings: ["Greetings, traveler.", "Well met."],
  creatorNotes: "Never sent to the model.",
  tags: ["fantasy", "guardian"],
  creator: "Card Author",
  cardCharacterVersion: "1.2.0",
  gender: "female",
  pronouns: "she/her",
  tagline: "The forest's guardian",
  systemPrompt: "You are Lyra.",
  postHistoryInstructions: "Stay in character.",
  extensions: { rm: { tagline: "The forest's guardian" } },
  unknownFields: { assets: [{ type: "icon" }], nickname: "The Guardian" },
  unknownRootFields: { custom_root_key: { nested: true } },
} as never)

beforeAll(async () => {
  runMigrations(db)
  await db.insert(characters).values({
    id: "char-legacy",
    name: "Legacy",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(characterVersions).values({
    id: "ver-legacy",
    characterId: "char-legacy",
    name: "Legacy",
    description: "Legacy description",
    greeting: "Legacy greeting",
    versionNumber: 1,
    createdAt: now,
  })
})

afterAll(() => {
  client.close()
  rmSync(root, { recursive: true, force: true })
})

describe("DrizzleCharacterRepository — S132 card fields", () => {
  it("persists and reads back the 16 card fields", async () => {
    const repository = new DrizzleCharacterRepository(db)

    await repository.createWithFirstVersion(character, cardVersion)
    const found = await repository.findVersionById("ver-s132")

    expect(found).not.toBeNull()
    if (!found) return

    expect(field(found, "personality")).toBe("Brave and kind.")
    expect(field(found, "scenario")).toBe("An ancient forest.")
    expect(field(found, "mesExample")).toBe("<START>\n{{char}}: Welcome.")
    expect(field(found, "alternateGreetings")).toEqual([
      "Greetings, traveler.",
      "Well met.",
    ])
    expect(field(found, "creatorNotes")).toBe("Never sent to the model.")
    expect(field(found, "tags")).toEqual(["fantasy", "guardian"])
    expect(field(found, "creator")).toBe("Card Author")
    expect(field(found, "cardCharacterVersion")).toBe("1.2.0")
    expect(field(found, "gender")).toBe("female")
    expect(field(found, "pronouns")).toBe("she/her")
    expect(field(found, "tagline")).toBe("The forest's guardian")
    expect(field(found, "systemPrompt")).toBe("You are Lyra.")
    expect(field(found, "postHistoryInstructions")).toBe("Stay in character.")
    expect(field(found, "extensions")).toEqual({
      rm: { tagline: "The forest's guardian" },
    })
    expect(field(found, "unknownFields")).toEqual({
      assets: [{ type: "icon" }],
      nickname: "The Guardian",
    })
    expect(field(found, "unknownRootFields")).toEqual({
      custom_root_key: { nested: true },
    })
  })

  it("saves card fields on an additional version", async () => {
    const repository = new DrizzleCharacterRepository(db)
    const second = CharacterVersion.create({
      id: "ver-s132-2",
      characterId: "char-s132",
      name: "Lyra",
      subtitle: null,
      profileImageAssetId: null,
      description: "A guardian of the forest.",
      instructions: null,
      greeting: "Hello, traveler.",
      versionNumber: 2,
      createdAt: now,
      cards: [],
      personality: "Changed personality.",
      unknownFields: { changed: true },
    } as never)

    await repository.saveVersion(second)
    const found = await repository.findVersionById("ver-s132-2")

    expect(field(found, "personality")).toBe("Changed personality.")
    expect(field(found, "unknownFields")).toEqual({ changed: true })
  })

  it("keeps legacy rows empty (null / []) without changing the prompt", async () => {
    const repository = new DrizzleCharacterRepository(db)
    const found = await repository.findVersionById("ver-legacy")

    expect(found).not.toBeNull()
    if (!found) return

    expect(field(found, "personality")).toBeNull()
    expect(field(found, "scenario")).toBeNull()
    expect(field(found, "mesExample")).toBeNull()
    expect(field(found, "alternateGreetings")).toEqual([])
    expect(field(found, "creatorNotes")).toBeNull()
    expect(field(found, "tags")).toEqual([])
    expect(field(found, "creator")).toBeNull()
    expect(field(found, "cardCharacterVersion")).toBeNull()
    expect(field(found, "gender")).toBeNull()
    expect(field(found, "pronouns")).toBeNull()
    expect(field(found, "tagline")).toBeNull()
    expect(field(found, "systemPrompt")).toBeNull()
    expect(field(found, "postHistoryInstructions")).toBeNull()
    expect(field(found, "extensions")).toBeNull()
    expect(field(found, "unknownFields")).toBeNull()
    expect(field(found, "unknownRootFields")).toBeNull()
  })
})
