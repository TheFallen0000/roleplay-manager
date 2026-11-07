import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../config/database"

const migrationsDir = fileURLToPath(new URL(".", import.meta.url))
const root = mkdtempSync(join(tmpdir(), "rm-migration-0019-"))
const db = buildDatabase(join(root, "test.db"))
const sqlite = (db as unknown as {
  $client: {
    prepare: (sql: string) => {
      all: (...params: unknown[]) => Record<string, unknown>[]
    }
    close: () => void
  }
}).$client

const readJournal = (): {
  entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
} =>
  JSON.parse(
    readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8")
  ) as {
    entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
  }

const tableNames = (): string[] =>
  sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => String(row.name))

const columnsOf = (table: string): string[] =>
  columnInfo(table).map((row) => String(row.name))

const columnInfo = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA table_info(${table})`).all()

const indexesOf = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA index_list(${table})`).all()

const indexColumnsOf = (index: string): string[] =>
  sqlite
    .prepare(`PRAGMA index_info(${index})`)
    .all()
    .map((row) => String(row.name))

const foreignKeysOf = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA foreign_key_list(${table})`).all()

const NEW_VERSION_COLUMNS = [
  "personality",
  "scenario",
  "mes_example",
  "alternate_greetings",
  "creator_notes",
  "tags",
  "creator",
  "card_character_version",
  "gender",
  "pronouns",
  "tagline",
  "system_prompt",
  "post_history_instructions",
  "extensions",
  "unknown_fields",
  "unknown_root_fields",
]

describe("migration 0019_character_cards", () => {
  beforeAll(() => {
    runMigrations(db)
  })

  afterAll(() => {
    sqlite.close()
    rmSync(root, { recursive: true, force: true })
  })

  it("registers idx 19 version 6 with breakpoints and ships the SQL + snapshot", () => {
    const journal = readJournal()
    const entry = journal.entries.find((item) => item.idx === 19)

    expect(entry).toMatchObject({
      idx: 19,
      version: "6",
      breakpoints: true,
    })
    expect(entry?.tag).toMatch(/^0019_/)

    const files = readdirSync(migrationsDir)
    expect(files.some((file) => /^0019_.*\.sql$/.test(file))).toBe(true)
    expect(existsSync(join(migrationsDir, "meta", "0019_snapshot.json"))).toBe(
      true
    )
  })

  it("is copied as a whole folder by the packaging script", () => {
    const packageScript = readFileSync(
      fileURLToPath(new URL("../../../../../../scripts/package.mjs", import.meta.url)),
      "utf8"
    )

    expect(packageScript).toContain("database/migrations")
    expect(packageScript).toContain('"migrations"')
  })

  it("adds the 16 nullable character_versions columns", () => {
    const columns = columnsOf("character_versions")

    for (const column of NEW_VERSION_COLUMNS) {
      expect(columns).toContain(column)
    }
    expect(new Set(columns).size).toBe(columns.length)

    const info = columnInfo("character_versions")
    for (const column of NEW_VERSION_COLUMNS) {
      const row = info.find((item) => item.name === column)
      expect(row, column).toMatchObject({ notnull: 0, dflt_value: null })
    }
  })

  it("creates the lorebooks and lorebook_entries tables", () => {
    const tables = tableNames()

    expect(tables).toEqual(
      expect.arrayContaining(["lorebooks", "lorebook_entries"])
    )

    expect(columnsOf("lorebooks")).toEqual(
      expect.arrayContaining([
        "id",
        "character_id",
        "name",
        "description",
        "scan_depth",
        "token_budget",
        "recursive_scanning",
        "extensions",
        "unknown_fields",
        "created_at",
        "updated_at",
      ])
    )

    expect(columnsOf("lorebook_entries")).toEqual(
      expect.arrayContaining([
        "id",
        "lorebook_id",
        "name",
        "source_id",
        "keys",
        "secondary_keys",
        "comment",
        "content",
        "constant",
        "selective",
        "selective_logic",
        "insertion_order",
        "position",
        "raw_position",
        "priority",
        "enabled",
        "case_sensitive",
        "whole_words",
        "order",
        "extensions",
        "unknown_fields",
        "created_at",
        "updated_at",
      ])
    )
  })

  it("enforces one lorebook per character with a unique index", () => {
    const uniqueOnCharacter = indexesOf("lorebooks").find(
      (index) =>
        index.unique === 1 &&
        indexColumnsOf(String(index.name)).length === 1 &&
        indexColumnsOf(String(index.name))[0] === "character_id"
    )

    expect(uniqueOnCharacter).toBeDefined()
    expect(uniqueOnCharacter?.name).toBe("lorebooks_character_idx")
  })

  it("indexes entries by lorebook and presentation order", () => {
    const entryIndex = indexesOf("lorebook_entries").find(
      (index) => index.name === "lorebook_entries_lorebook_idx"
    )

    expect(entryIndex).toBeDefined()
    expect(indexColumnsOf("lorebook_entries_lorebook_idx")).toEqual([
      "lorebook_id",
      "order",
    ])
  })

  it("cascades lorebooks with the character and entries with the book", () => {
    const bookFk = foreignKeysOf("lorebooks").find(
      (fk) => fk.from === "character_id"
    )
    expect(bookFk).toMatchObject({
      table: "characters",
      from: "character_id",
      on_delete: "CASCADE",
    })

    const entryFk = foreignKeysOf("lorebook_entries").find(
      (fk) => fk.from === "lorebook_id"
    )
    expect(entryFk).toMatchObject({
      table: "lorebooks",
      from: "lorebook_id",
      on_delete: "CASCADE",
    })
  })
})
