import { Readable } from "node:stream"
import { describe, expect, it } from "vitest"

import {
  ALL_EXPORT_SECTIONS,
  EXPORT_SECTION_PARENTS,
} from "@workspace/shared/types/export"

import { ExportCharacterUseCase } from "./export-character.use-case"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"

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
  subtitle: null,
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const lorebook = {
  id: "book-1",
  characterId: "char-1",
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  entries: [],
}

const buildUseCase = () =>
  new ExportCharacterUseCase(
    {
      createWithFirstVersion: async () => ({ character, version }),
      findById: async () => ({ character, currentVersion: version }),
      list: async () => [character],
      update: async (c) => c,
      delete: async () => {},
      findVersionById: async () => version,
      findVersionsByCharacterId: async () => [version],
      findMaxVersionNumber: async () => 1,
      saveVersion: async (v) => v,
      updateProfileImageAssetId: async () => {},
    },
    {
      create: async (c) => c,
      findById: async () => null,
      list: async () => [],
      listByCharacterId: async () => [],
      listByCharacterIds: async () => [],
      existsByAssetId: async () => false,
      update: async (c) => c,
      updateSettings: async () => ({}) as never,
      clearProviderInstanceId: async () => {},
    },
    {
      create: async (m) => m,
      findByConversationId: async () => [],
      findById: async () => null,
      findLastByConversationId: async () => null,
      update: async (m) => m,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    },
    {
      findById: async () => null,
      findByConversationId: async () => [],
      create: async (m) => m,
      update: async (m) => m,
      deleteById: async () => {},
    },
    {
      findById: async () => null,
      findByConversationId: async () => [],
      findLatestByConversationId: async () => null,
      create: async (s) => s,
      update: async (s) => s,
      deleteById: async () => {},
      deleteByIds: async () => {},
    },
    {
      create: async () => {},
      findById: async () => null,
      findByCharacterId: async () => [],
      deleteById: async () => {},
    },
    {
      write: async () => {},
      read: async () => Readable.from([]),
      delete: async () => {},
    },
    {
      findByCharacterId: async () => ({
        book: lorebook,
        entries: [],
      }),
      upsertBook: async (book: unknown) => book,
      createEntry: async (entry: unknown) => entry,
      updateEntry: async (entry: unknown) => entry,
      deleteEntry: async () => {},
      reorderEntries: async () => {},
      replaceBook: async () => {},
    } as never
  )

describe("internal export — lorebook section", () => {
  it("declares lorebook as a child of definition", () => {
    expect(ALL_EXPORT_SECTIONS).toContain("lorebook")
    expect(EXPORT_SECTION_PARENTS.lorebook).toBe("definition")
  })

  it("includes payload.lorebook when definition and lorebook are selected", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      sections: ["definition", "lorebook"] as never,
    })

    expect(result.lorebook).toMatchObject({
      id: "book-1",
      characterId: "char-1",
      name: "Forest lore",
      scanDepth: 4,
      tokenBudget: 400,
    })
  })

  it("rejects lorebook without definition", async () => {
    await expect(
      buildUseCase().execute({
        characterId: "char-1",
        sections: ["lorebook"] as never,
      })
    ).rejects.toMatchObject({ code: "INVALID_EXPORT_SELECTION" })
  })

  it("does not include a lorebook when the section is not selected", async () => {
    const result = await buildUseCase().execute({
      characterId: "char-1",
      sections: ["definition"],
    })

    expect(result.lorebook).toBeUndefined()
  })
})
