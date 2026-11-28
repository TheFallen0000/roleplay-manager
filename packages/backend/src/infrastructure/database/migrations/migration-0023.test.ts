import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../config/database"

const migrationsDir = fileURLToPath(new URL(".", import.meta.url))
const root = mkdtempSync(join(tmpdir(), "rm-migration-0023-"))
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

const nowSeconds = Math.floor(
  new Date("2026-11-28T12:00:00.000Z").getTime() / 1000,
)

const readJournal = (): {
  entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
} =>
  JSON.parse(
    readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8"),
  ) as {
    entries: Array<{ idx: number; version: string; tag: string; breakpoints: boolean }>
  }

const columnInfo = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA table_info(${table})`).all()

const columnOf = (table: string, name: string) =>
  columnInfo(table).find((row) => row.name === name)

const seedBase = () => {
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
}

const seedConversation = (id: string) => {
  // Legacy shape: no context_policy in the column list.
  sqlite
    .prepare(
      "INSERT INTO conversations (id, version_id, created_at, updated_at) VALUES (?, 'ver-1', ?, ?)",
    )
    .run(id, nowSeconds, nowSeconds)
}

const insertExplicitPolicy = () => {
  sqlite
    .prepare(
      "INSERT INTO conversations (id, version_id, context_policy, created_at, updated_at) VALUES ('conv-deep', 'ver-1', 'deep', ?, ?)",
    )
    .run(nowSeconds, nowSeconds)
}

describe("migration 0023_context_policy", () => {
  beforeAll(() => {
    runMigrations(db)
    seedBase()
  })

  afterAll(() => {
    sqlite.close()
    rmSync(root, { recursive: true, force: true })
  })

  it("registers idx 23 version 6 with breakpoints and ships the SQL + snapshot", () => {
    const journal = readJournal()
    const entry = journal.entries.find((item) => item.idx === 23)

    expect(entry).toMatchObject({
      idx: 23,
      version: "6",
      breakpoints: true,
    })
    expect(entry?.tag).toMatch(/^0023_/)

    const files = readdirSync(migrationsDir)
    expect(files.some((file) => /^0023_.*\.sql$/.test(file))).toBe(true)
    expect(
      existsSync(join(migrationsDir, "meta", "0023_snapshot.json")),
    ).toBe(true)
  })

  it("adds a NOT NULL context_policy column defaulting to balanced", () => {
    const column = columnOf("conversations", "context_policy")

    expect(column).toBeDefined()
    expect(column).toMatchObject({ notnull: 1 })
    expect(String(column?.dflt_value)).toMatch(/balanced/)
  })

  it("keeps rows inserted without the column at balanced (backfill by DEFAULT)", () => {
    seedConversation("conv-legacy")

    expect(
      sqlite
        .prepare("SELECT context_policy FROM conversations WHERE id = 'conv-legacy'")
        .get(),
    ).toMatchObject({ context_policy: "balanced" })
  })

  it("persists an explicit policy", () => {
    insertExplicitPolicy()

    expect(
      sqlite
        .prepare("SELECT context_policy FROM conversations WHERE id = 'conv-deep'")
        .get(),
    ).toMatchObject({ context_policy: "deep" })
  })
})
