import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../../../config/database"
import { Lorebook } from "../../../../../domain/entities/lorebook.entity"
import { LorebookEntry } from "../../../../../domain/entities/lorebook-entry.entity"
import { characters, lorebookEntries, lorebooks } from "../schema"
import { DrizzleLorebookRepository } from "./drizzle-lorebook.repository"

const root = mkdtempSync(join(tmpdir(), "rm-lorebook-repository-"))
const db = buildDatabase(join(root, "test.db"))
const client = (db as unknown as { $client: { close: () => void } }).$client
const now = new Date("2026-11-07T12:00:00.000Z")

const buildBook = (overrides: Record<string, unknown> = {}) =>
  Lorebook.create({
    id: "book-1",
    characterId: "char-1",
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    extensions: {},
    unknownFields: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as never)

const buildEntry = (overrides: Record<string, unknown> = {}) =>
  LorebookEntry.create({
    id: "entry-1",
    lorebookId: "book-1",
    name: "Dragon lore",
    sourceId: "1",
    keys: ["dragon"],
    secondaryKeys: [],
    comment: "Dragon lore",
    content: "Dragons dwell in the northern mountains.",
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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as never)

beforeAll(async () => {
  runMigrations(db)
  await db.insert(characters).values([
    { id: "char-1", name: "Lyra", createdAt: now, updatedAt: now },
    { id: "char-2", name: "Kael", createdAt: now, updatedAt: now },
    { id: "char-3", name: "Aria", createdAt: now, updatedAt: now },
  ])
})

afterAll(() => {
  client.close()
  rmSync(root, { recursive: true, force: true })
})

describe("DrizzleLorebookRepository", () => {
  it("upserts a book and reads its entries ordered by order", async () => {
    const repository = new DrizzleLorebookRepository(db)

    await repository.upsertBook(buildBook())
    await repository.createEntry(buildEntry({ id: "entry-b", order: 2 }))
    await repository.createEntry(buildEntry({ id: "entry-a", order: 1 }))

    const found = await repository.findByCharacterId("char-1")

    expect(found).not.toBeNull()
    expect(found?.book.id).toBe("book-1")
    expect(found?.book.characterId).toBe("char-1")
    expect(found?.book.scanDepth).toBe(4)
    expect(found?.book.tokenBudget).toBe(400)
    expect(found?.entries.map((entry) => entry.id)).toEqual([
      "entry-a",
      "entry-b",
    ])
    expect(found?.entries[0].keys).toEqual(["dragon"])
  })

  it("updates an existing book instead of duplicating it", async () => {
    const repository = new DrizzleLorebookRepository(db)

    await repository.upsertBook(
      buildBook({ name: "Updated lore", tokenBudget: 1000 })
    )

    const found = await repository.findByCharacterId("char-1")
    expect(found?.book.name).toBe("Updated lore")
    expect(found?.book.tokenBudget).toBe(1_000)

    const rows = await db.select().from(lorebooks)
    expect(rows.filter((row) => row.characterId === "char-1")).toHaveLength(1)
  })

  it("enforces UNIQUE(character_id) at the database level", async () => {
    const repository = new DrizzleLorebookRepository(db)
    await repository.upsertBook(buildBook({ id: "book-2", characterId: "char-2" }))

    await expect(
      db.insert(lorebooks).values({
        id: "book-duplicate",
        characterId: "char-2",
        scanDepth: 4,
        tokenBudget: 400,
        recursiveScanning: 0,
        createdAt: now,
        updatedAt: now,
      })
    ).rejects.toThrow()
  })

  it("cascades the book and its entries when the character is deleted", async () => {
    const repository = new DrizzleLorebookRepository(db)
    await repository.upsertBook(buildBook())
    await repository.createEntry(buildEntry())

    await db.delete(characters).where(eq(characters.id, "char-1"))

    expect(await repository.findByCharacterId("char-1")).toBeNull()
    const remaining = await db
      .select()
      .from(lorebookEntries)
    expect(
      remaining.filter((entry) => entry.lorebookId === "book-1")
    ).toHaveLength(0)
  })

  it("replaces the book and its entries in one transaction", async () => {
    const repository = new DrizzleLorebookRepository(db)
    await repository.upsertBook(
      buildBook({ id: "book-replace", characterId: "char-3" })
    )
    await repository.createEntry(
      buildEntry({ id: "old-entry", lorebookId: "book-replace" })
    )

    await repository.replaceBook(
      buildBook({ id: "book-replace", characterId: "char-3", name: "New" }),
      [
        buildEntry({
          id: "new-entry",
          lorebookId: "book-replace",
          order: 0,
        }),
      ]
    )

    const found = await repository.findByCharacterId("char-3")
    expect(found?.book.name).toBe("New")
    expect(found?.entries.map((entry) => entry.id)).toEqual(["new-entry"])
  })
})
