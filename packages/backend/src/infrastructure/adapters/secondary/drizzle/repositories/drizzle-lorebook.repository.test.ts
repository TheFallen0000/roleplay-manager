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
const client = (
  db as unknown as {
    $client: {
      prepare: (sql: string) => {
        all: (...params: unknown[]) => Record<string, unknown>[]
        get: (...params: unknown[]) => Record<string, unknown> | undefined
        run: (...params: unknown[]) => unknown
      }
      close: () => void
    }
  }
).$client
const now = new Date("2026-11-07T12:00:00.000Z")
const unixNow = Math.floor(now.getTime() / 1000)

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

const buildStandaloneBook = (overrides: Record<string, unknown> = {}) =>
  Lorebook.create({
    id: "book-standalone",
    name: "Standalone lore",
    description: "Not owned by a character",
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

const secondEntry = (bookId = "book-1") =>
  buildEntry({
    id: "entry-2",
    lorebookId: bookId,
    name: "River lore",
    sourceId: "2",
    keys: ["river"],
    comment: "River lore",
    content: "The river is old.",
    order: 1,
    rawPosition: "2",
  })

const loadVersionEntity = async () => {
  const module = await import(
    "../../../../../domain/entities/lorebook-version.entity"
  )
  return module.LorebookVersion
}

const buildVersion = async (
  overrides: Record<string, unknown> = {},
): Promise<unknown> => {
  const LorebookVersion = await loadVersionEntity()
  return LorebookVersion.create({
    id: "version-1",
    lorebookId: "book-1",
    versionNumber: 1,
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    entriesJson: JSON.stringify([
      { id: "entry-1", order: 0, content: "Dragons dwell in the northern mountains." },
      { id: "entry-2", order: 1, content: "The river is old." },
    ]),
    sourceKey: "a".repeat(64),
    createdAt: now,
    ...overrides,
  } as never)
}

const versionsOf = (bookId: string): Array<Record<string, unknown>> =>
  client
    .prepare(
      "SELECT * FROM lorebook_versions WHERE lorebook_id = ? ORDER BY version_number",
    )
    .all(bookId)

const containerRow = (bookId: string): Record<string, unknown> | undefined =>
  client.prepare("SELECT * FROM lorebooks WHERE id = ?").get(bookId)

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

describe("DrizzleLorebookRepository — live head compat", () => {
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

describe("DrizzleLorebookRepository — S133 container model", () => {
  it("builds a standalone container without a character", () => {
    const book = buildStandaloneBook()

    expect(book.characterId).toBeNull()
    expect(book.name).toBe("Standalone lore")
  })

  it("allows several containers for the same legacy character", async () => {
    await db.insert(lorebooks).values([
      {
        id: "book-multi-1",
        characterId: "char-2",
        scanDepth: 4,
        tokenBudget: 400,
        recursiveScanning: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "book-multi-2",
        characterId: "char-2",
        scanDepth: 4,
        tokenBudget: 400,
        recursiveScanning: 0,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const rows = await db.select().from(lorebooks)
    expect(rows.filter((row) => row.characterId === "char-2")).toHaveLength(2)
  })

  it("does not delete the book or its entries when the character is deleted", async () => {
    await db.insert(characters).values({
      id: "char-cascade",
      name: "Cascade",
      createdAt: now,
      updatedAt: now,
    })

    const repository = new DrizzleLorebookRepository(db)
    await repository.upsertBook(
      buildBook({ id: "book-cascade", characterId: "char-cascade" })
    )
    await repository.createEntry(
      buildEntry({ id: "entry-cascade", lorebookId: "book-cascade" })
    )

    await db.delete(characters).where(eq(characters.id, "char-cascade"))

    const found = await repository.findById("book-cascade")
    expect(found?.book.id).toBe("book-cascade")
    const remaining = await db.select().from(lorebookEntries)
    expect(
      remaining.filter((entry) => entry.lorebookId === "book-cascade")
    ).toHaveLength(1)
  })
})

describe("DrizzleLorebookRepository — versioning", () => {
  it("creates a container, its live entries and v1 in one call", async () => {
    const repository = new DrizzleLorebookRepository(db)
    const book = buildStandaloneBook({ id: "book-v1" })
    const entry = buildEntry({ id: "entry-v1", lorebookId: "book-v1" })
    const version = await buildVersion({
      id: "version-v1",
      lorebookId: "book-v1",
    })

    await repository.createContainerWithVersion(
      book,
      [entry],
      version as never,
    )

    const found = await repository.findById("book-v1")
    expect(found?.book.id).toBe("book-v1")
    expect(found?.entries.map((item) => item.id)).toEqual(["entry-v1"])

    const container = containerRow("book-v1")
    expect(container?.current_version_id).toBe("version-v1")
    expect(container?.character_id).toBeNull()

    const versions = await repository.findVersions("book-v1")
    expect(versions.map((item) => item.id)).toEqual(["version-v1"])
  })

  it("creates v2 only when the canonical content changed", async () => {
    const repository = new DrizzleLorebookRepository(db)
    const book = buildStandaloneBook({
      id: "book-versioned",
      name: "Versioned lore",
    })
    const entry = buildEntry({
      id: "versioned-entry-1",
      lorebookId: "book-versioned",
    })
    const version = await buildVersion({
      id: "versioned-v1",
      lorebookId: "book-versioned",
      name: "Versioned lore",
    })
    await repository.createContainerWithVersion(
      book,
      [entry],
      version as never,
    )

    await repository.saveLiveHeadAndVersion(book, [entry])
    expect(versionsOf("book-versioned")).toHaveLength(1)

    await repository.saveLiveHeadAndVersion(
      book.withSettings({ name: "Renamed lore" }),
      [entry],
    )
    expect(versionsOf("book-versioned")).toHaveLength(2)
  })

  it("creates a new version when entries are reordered", async () => {
    const repository = new DrizzleLorebookRepository(db)
    const book = buildStandaloneBook({
      id: "book-reorder",
      name: "Reorder lore",
    })
    const first = buildEntry({
      id: "reorder-1",
      lorebookId: "book-reorder",
      order: 0,
    })
    const second = secondEntry("book-reorder")
    const version = await buildVersion({
      id: "reorder-v1",
      lorebookId: "book-reorder",
      name: "Reorder lore",
    })
    await repository.createContainerWithVersion(
      book,
      [first, second],
      version as never,
    )

    const reordered = [
      buildEntry({
        id: "reorder-2",
        lorebookId: "book-reorder",
        name: "River lore",
        keys: ["river"],
        content: "The river is old.",
        order: 0,
      }),
      buildEntry({
        id: "reorder-1",
        lorebookId: "book-reorder",
        name: "Dragon lore",
        keys: ["dragon"],
        content: "Dragons dwell in the northern mountains.",
        order: 1,
      }),
    ]
    await repository.saveLiveHeadAndVersion(book, reordered)

    const versions = versionsOf("book-reorder")
    expect(versions).toHaveLength(2)
    expect(versions[0].source_key).not.toBe(versions[1].source_key)
    expect(containerRow("book-reorder")?.current_version_id).toBe(
      versions[1].id,
    )
  })

  it("keeps an old version immutable after the live head changes", async () => {
    const repository = new DrizzleLorebookRepository(db)
    const book = buildStandaloneBook({
      id: "book-immutable",
      name: "Immutable lore",
    })
    const entry = buildEntry({
      id: "immutable-1",
      lorebookId: "book-immutable",
      content: "Original content.",
    })
    const version = await buildVersion({
      id: "immutable-v1",
      lorebookId: "book-immutable",
      name: "Immutable lore",
      entriesJson: JSON.stringify([{ id: "immutable-1", content: "Original content." }]),
    })
    await repository.createContainerWithVersion(
      book,
      [entry],
      version as never,
    )

    await repository.saveLiveHeadAndVersion(book, [
      buildEntry({
        id: "immutable-1",
        lorebookId: "book-immutable",
        content: "Changed content.",
      }),
    ])

    const oldVersion = await repository.findVersionById("immutable-v1")
    expect(oldVersion).not.toBeNull()
    expect(oldVersion?.entriesJson).toContain("Original content.")
    expect(oldVersion?.entriesJson).not.toContain("Changed content.")
  })

  it("lists only live containers", async () => {
    const repository = new DrizzleLorebookRepository(db)
    await db.insert(lorebooks).values([
      {
        id: "book-live",
        characterId: null,
        name: "Live lore",
        scanDepth: 4,
        tokenBudget: 400,
        recursiveScanning: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "book-deleted",
        characterId: null,
        name: "Deleted lore",
        scanDepth: 4,
        tokenBudget: 400,
        recursiveScanning: 0,
        createdAt: now,
        updatedAt: now,
      },
    ])
    client
      .prepare("UPDATE lorebooks SET deleted_at = ? WHERE id = ?")
      .run(unixNow, "book-deleted")

    const books = await repository.list()
    const ids = books.map((item) => item.id)
    expect(ids).toContain("book-live")
    expect(ids).not.toContain("book-deleted")
  })
})
