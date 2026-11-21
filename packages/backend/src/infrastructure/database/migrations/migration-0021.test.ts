import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../config/database"

const migrationsDir = fileURLToPath(new URL(".", import.meta.url))
const root = mkdtempSync(join(tmpdir(), "rm-migration-0021-"))
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

const nowSeconds = Math.floor(new Date("2026-11-21T12:00:00.000Z").getTime() / 1000)

const readJournal = (): {
  entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
} =>
  JSON.parse(
    readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8")
  ) as {
    entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
  }

const columnInfo = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA table_info(${table})`).all()

const columnOf = (table: string, name: string) =>
  columnInfo(table).find((row) => row.name === name)

const indexesOf = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA index_list(${table})`).all()

const indexColumnsOf = (index: string): string[] =>
  sqlite
    .prepare(`PRAGMA index_info(${index})`)
    .all()
    .map((row) => String(row.name))

const uniqueIndexOn = (table: string, columns: string[]) =>
  indexesOf(table).find(
    (index) =>
      index.unique === 1 &&
      JSON.stringify(indexColumnsOf(String(index.name))) ===
        JSON.stringify(columns),
  )

const seedConversation = () => {
  sqlite
    .prepare(
      "INSERT INTO characters (id, name, created_at, updated_at) VALUES ('char-1', 'Lyra', ?, ?)",
    )
    .run(nowSeconds, nowSeconds)
  sqlite
    .prepare(
      "INSERT INTO character_versions (id, character_id, name, description, greeting, version_number, created_at) VALUES ('ver-1', 'char-1', 'Lyra', 'Guardián', 'Hola', 1, ?)",
    )
    .run(nowSeconds)
  sqlite
    .prepare(
      "INSERT INTO conversations (id, version_id, created_at, updated_at) VALUES ('conv-1', 'ver-1', ?, ?)",
    )
    .run(nowSeconds, nowSeconds)
}

const insertLegacyMemory = (id: string, actor: string, title: string) =>
  sqlite
    .prepare(
      `INSERT INTO memories
        (id, conversation_id, actor, title, description, priority, created_by, updated_by, created_at, updated_at)
       VALUES (?, 'conv-1', ?, ?, 'Legacy memory', 5, 'assistant', 'system', ?, ?)`,
    )
    .run(id, actor, title, nowSeconds, nowSeconds)

const insertLegacyProposal = (id: string) =>
  sqlite
    .prepare(
      `INSERT INTO memory_change_proposals
        (id, conversation_id, operation, actor, title, description, priority, created_at)
       VALUES (?, 'conv-1', 'CREATE', 'Lyra', 'Misión', 'Legacy proposal', 5, ?)`,
    )
    .run(id, nowSeconds)

describe("migration 0021_memory_types", () => {
  beforeAll(() => {
    runMigrations(db)
    seedConversation()
  })

  afterAll(() => {
    sqlite.close()
    rmSync(root, { recursive: true, force: true })
  })

  it("registers idx 21 version 6 with breakpoints and ships the SQL + snapshot", () => {
    const journal = readJournal()
    const entry = journal.entries.find((item) => item.idx === 21)

    expect(entry).toMatchObject({
      idx: 21,
      version: "6",
      breakpoints: true,
    })
    expect(entry?.tag).toMatch(/^0021_/)

    const files = readdirSync(migrationsDir)
    expect(files.some((file) => /^0021_.*\.sql$/.test(file))).toBe(true)
    expect(existsSync(join(migrationsDir, "meta", "0021_snapshot.json"))).toBe(
      true,
    )
  })

  it("adds a type column defaulting to fact on memories and proposals", () => {
    expect(columnOf("memories", "type")).toBeDefined()
    expect(String(columnOf("memories", "type")?.dflt_value)).toMatch(/fact/)

    expect(columnOf("memory_change_proposals", "type")).toBeDefined()
    expect(
      String(columnOf("memory_change_proposals", "type")?.dflt_value),
    ).toMatch(/fact/)
  })

  it("treats pre-0021 inserts without type as fact", () => {
    insertLegacyMemory("mem-legacy", "Lyra", "Memoria antigua")
    insertLegacyProposal("proposal-legacy")

    expect(
      sqlite
        .prepare("SELECT type FROM memories WHERE id = 'mem-legacy'")
        .get(),
    ).toMatchObject({ type: "fact" })
    expect(
      sqlite
        .prepare(
          "SELECT type FROM memory_change_proposals WHERE id = 'proposal-legacy'",
        )
        .get(),
    ).toMatchObject({ type: "fact" })
  })

  it("replaces the title unique index with conversation + actor + title", () => {
    expect(
      uniqueIndexOn("memories", ["conversation_id", "actor", "title"]),
    ).toBeDefined()
    expect(uniqueIndexOn("memories", ["conversation_id", "title"])).toBeUndefined()
  })

  it("allows the same title for different actors but not for the same actor", () => {
    insertLegacyMemory("mem-lyra", "Lyra", "Misión")
    insertLegacyMemory("mem-kael", "Kael", "Misión")

    expect(() => insertLegacyMemory("mem-lyra-dup", "Lyra", "Misión")).toThrow()
    expect(() => insertLegacyMemory("mem-kael-dup", "Kael", "Misión")).toThrow()
    expect(() => insertLegacyMemory("mem-other", "Selene", "Misión")).not.toThrow()
  })
})
