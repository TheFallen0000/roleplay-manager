import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../config/database"

const migrationsDir = fileURLToPath(new URL(".", import.meta.url))
const root = mkdtempSync(join(tmpdir(), "rm-migration-0020-"))
const db = buildDatabase(join(root, "test.db"))
const sqlite = (
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

const readJournal = (): {
  entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
} =>
  JSON.parse(
    readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8")
  ) as {
    entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
  }

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

const indexOn = (
  table: string,
  column: string,
): Record<string, unknown> | undefined =>
  indexesOf(table).find(
    (index) =>
      indexColumnsOf(String(index.name)).length === 1 &&
      indexColumnsOf(String(index.name))[0] === column,
  )

const VERSION_COLUMNS = [
  "id",
  "lorebook_id",
  "version_number",
  "name",
  "description",
  "scan_depth",
  "token_budget",
  "recursive_scanning",
  "entries_json",
  "source_key",
  "created_at",
]

describe("migration 0020_lorebook_versions", () => {
  beforeAll(() => {
    runMigrations(db)
  })

  afterAll(() => {
    sqlite.close()
    rmSync(root, { recursive: true, force: true })
  })

  it("registers idx 20 version 6 with breakpoints and ships the SQL + snapshot", () => {
    const journal = readJournal()
    const entry = journal.entries.find((item) => item.idx === 20)

    expect(entry).toMatchObject({
      idx: 20,
      version: "6",
      breakpoints: true,
    })
    expect(entry?.tag).toMatch(/^0020_/)

    const files = readdirSync(migrationsDir)
    expect(files.some((file) => /^0020_.*\.sql$/.test(file))).toBe(true)
    expect(existsSync(join(migrationsDir, "meta", "0020_snapshot.json"))).toBe(
      true
    )
  })

  it("creates lorebook_versions with a unique book/version index and a source_key index", () => {
    expect(columnsOf("lorebook_versions")).toEqual(
      expect.arrayContaining(VERSION_COLUMNS)
    )

    const uniqueNumber = indexesOf("lorebook_versions").find((index) => {
      const columns = indexColumnsOf(String(index.name))
      return (
        index.unique === 1 &&
        columns.length === 2 &&
        columns[0] === "lorebook_id" &&
        columns[1] === "version_number"
      )
    })
    expect(uniqueNumber).toBeDefined()

    expect(indexOn("lorebook_versions", "source_key")).toBeDefined()
  })

  it("rebuilds lorebooks with nullable legacy character_id and no character FK/index", () => {
    const columns = columnsOf("lorebooks")
    expect(columns).toEqual(
      expect.arrayContaining(["origin_id", "current_version_id", "deleted_at"])
    )

    const characterColumn = columnInfo("lorebooks").find(
      (row) => row.name === "character_id"
    )
    expect(characterColumn).toMatchObject({ notnull: 0 })

    const legacyIndex = indexesOf("lorebooks").find(
      (index) => index.name === "lorebooks_character_idx"
    )
    expect(legacyIndex).toBeUndefined()

    const characterFk = foreignKeysOf("lorebooks").find(
      (fk) => fk.from === "character_id"
    )
    expect(characterFk).toBeUndefined()

    const currentVersionFk = foreignKeysOf("lorebooks").find(
      (fk) => fk.from === "current_version_id"
    )
    expect(currentVersionFk).toMatchObject({
      table: "lorebook_versions",
      from: "current_version_id",
      on_delete: "SET NULL",
    })
  })

  it("adds a nullable RESTRICT lorebook_version_id link to character_versions", () => {
    const column = columnInfo("character_versions").find(
      (row) => row.name === "lorebook_version_id"
    )
    expect(column).toMatchObject({ notnull: 0 })

    const fk = foreignKeysOf("character_versions").find(
      (item) => item.from === "lorebook_version_id"
    )
    expect(fk).toMatchObject({
      table: "lorebook_versions",
      from: "lorebook_version_id",
      on_delete: "RESTRICT",
    })

    expect(indexOn("character_versions", "lorebook_version_id")).toBeDefined()
  })

  it("keeps the lorebook_entries cascade intact", () => {
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
