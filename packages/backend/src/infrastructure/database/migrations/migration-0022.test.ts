import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../config/database"

const migrationsDir = fileURLToPath(new URL(".", import.meta.url))
const root = mkdtempSync(join(tmpdir(), "rm-migration-0022-"))
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
  new Date("2026-11-21T12:00:00.000Z").getTime() / 1000,
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

const columnsOf = (table: string): string[] =>
  columnInfo(table).map((row) => String(row.name))

const indexesOf = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA index_list(${table})`).all()

const indexColumnsOf = (index: string): string[] =>
  sqlite
    .prepare(`PRAGMA index_info(${index})`)
    .all()
    .map((row) => String(row.name))

const foreignKeysOf = (table: string): Array<Record<string, unknown>> =>
  sqlite.prepare(`PRAGMA foreign_key_list(${table})`).all()

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

const insertMemory = (id: string) =>
  sqlite
    .prepare(
      `INSERT INTO memories
        (id, conversation_id, actor, title, description, priority, created_by, updated_by, created_at, updated_at)
       VALUES (?, 'conv-1', 'Lyra', ?, 'Un hecho.', 5, 'assistant', 'system', ?, ?)`,
    )
    .run(id, `Memoria ${id}`, nowSeconds, nowSeconds)

const insertEmbedding = (memoryId: string) =>
  sqlite
    .prepare(
      `INSERT INTO memory_embeddings
        (memory_id, provider, model, dimension, vector, text_hash, created_at, updated_at)
       VALUES (?, 'ollama', 'nomic-embed-text', 3, ?, 'hash-1', ?, ?)`,
    )
    .run(
      memoryId,
      Buffer.from(new Float32Array([0.5, -0.25, 0.75]).buffer),
      nowSeconds,
      nowSeconds,
    )

describe("migration 0022_memory_embeddings", () => {
  beforeAll(() => {
    runMigrations(db)
    seedConversation()
  })

  afterAll(() => {
    sqlite.close()
    rmSync(root, { recursive: true, force: true })
  })

  it("registers idx 22 version 6 with breakpoints and ships the SQL + snapshot", () => {
    const journal = readJournal()
    const entry = journal.entries.find((item) => item.idx === 22)

    expect(entry).toMatchObject({
      idx: 22,
      version: "6",
      breakpoints: true,
    })
    expect(entry?.tag).toMatch(/^0022_/)

    const files = readdirSync(migrationsDir)
    expect(files.some((file) => /^0022_.*\.sql$/.test(file))).toBe(true)
    expect(existsSync(join(migrationsDir, "meta", "0022_snapshot.json"))).toBe(
      true,
    )
  })

  it("creates memory_embeddings with the derived vector columns", () => {
    expect(columnsOf("memory_embeddings")).toEqual(
      expect.arrayContaining([
        "memory_id",
        "provider",
        "model",
        "dimension",
        "vector",
        "text_hash",
        "created_at",
        "updated_at",
      ]),
    )

    const vectorColumn = columnInfo("memory_embeddings").find(
      (row) => row.name === "vector",
    )
    expect(String(vectorColumn?.type).toLowerCase()).toContain("blob")

    const dimensionColumn = columnInfo("memory_embeddings").find(
      (row) => row.name === "dimension",
    )
    expect(String(dimensionColumn?.type).toLowerCase()).toContain("int")
  })

  it("makes memory_id the primary key and cascades when the memory is deleted", () => {
    const memoryColumn = columnInfo("memory_embeddings").find(
      (row) => row.name === "memory_id",
    )
    expect(memoryColumn).toMatchObject({ pk: 1 })

    const foreignKey = foreignKeysOf("memory_embeddings").find(
      (row) => row.from === "memory_id",
    )
    expect(foreignKey).toMatchObject({
      table: "memories",
      from: "memory_id",
      on_delete: "CASCADE",
    })
  })

  it("keeps one embedding row per memory with a unique index", () => {
    const uniqueOnMemory = indexesOf("memory_embeddings").find((index) => {
      const columns = indexColumnsOf(String(index.name))
      return (
        index.unique === 1 &&
        columns.length === 1 &&
        columns[0] === "memory_id"
      )
    })
    expect(uniqueOnMemory).toBeDefined()
  })

  it("deletes the derived vector when its memory is deleted", () => {
    insertMemory("mem-cascade")
    insertEmbedding("mem-cascade")

    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM memory_embeddings WHERE memory_id = 'mem-cascade'",
        )
        .get(),
    ).toMatchObject({ count: 1 })

    sqlite.prepare("DELETE FROM memories WHERE id = 'mem-cascade'").run()

    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM memory_embeddings WHERE memory_id = 'mem-cascade'",
        )
        .get(),
    ).toMatchObject({ count: 0 })
  })
})
