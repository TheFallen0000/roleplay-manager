import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../../../config/database"
import type {
  EmbeddingTarget,
  MemoryEmbeddingRecord,
} from "../../../../../domain/ports/embedding.repository"
import { DrizzleMemoryEmbeddingRepository } from "./drizzle-memory-embedding.repository"

const root = mkdtempSync(join(tmpdir(), "rm-memory-embedding-repository-"))
const db = buildDatabase(join(root, "test.db"))
const sqlite = (
  db as unknown as {
    $client: {
      prepare: (sql: string) => {
        run: (...params: unknown[]) => unknown
      }
      close: () => void
    }
  }
).$client

const now = new Date("2026-11-21T12:00:00.000Z")
const unixNow = Math.floor(now.getTime() / 1000)

const target: EmbeddingTarget = {
  provider: "ollama",
  model: "nomic-embed-text",
  dimension: 3,
}

const insertMemory = (id: string) =>
  sqlite
    .prepare(
      `INSERT INTO memories
        (id, conversation_id, actor, title, description, priority, created_by, updated_by, created_at, updated_at)
       VALUES (?, 'conv-1', 'Nadie', ?, 'Un hecho.', 5, 'assistant', 'system', ?, ?)`,
    )
    .run(id, `Memoria ${id}`, unixNow, unixNow)

const seedConversation = () => {
  sqlite
    .prepare(
      "INSERT INTO characters (id, name, created_at, updated_at) VALUES ('char-1', 'Lyra', ?, ?)",
    )
    .run(unixNow, unixNow)
  sqlite
    .prepare(
      "INSERT INTO character_versions (id, character_id, name, description, greeting, version_number, created_at) VALUES ('ver-1', 'char-1', 'Lyra', 'Guardián', 'Hola', 1, ?)",
    )
    .run(unixNow)
  sqlite
    .prepare(
      "INSERT INTO conversations (id, version_id, created_at, updated_at) VALUES ('conv-1', 'ver-1', ?, ?)",
    )
    .run(unixNow, unixNow)
}

const baseRecord = (
  overrides: Partial<Omit<MemoryEmbeddingRecord, "createdAt" | "updatedAt">> = {},
): Omit<MemoryEmbeddingRecord, "createdAt" | "updatedAt"> => ({
  memoryId: "mem-1",
  provider: "ollama",
  model: "nomic-embed-text",
  dimension: 3,
  vector: Float32Array.from([0.5, -0.25, 0.75]),
  textHash: "hash-1",
  ...overrides,
})

beforeAll(() => {
  runMigrations(db)
  seedConversation()
})

beforeEach(() => {
  sqlite.prepare("DELETE FROM memory_embeddings").run()
  sqlite.prepare("DELETE FROM memories").run()
})

afterAll(() => {
  sqlite.close()
  rmSync(root, { recursive: true, force: true })
})

describe("DrizzleMemoryEmbeddingRepository", () => {
  it("round-trips a Float32Array BLOB without losing precision", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-1")

    await repository.upsert(baseRecord())

    const rows = await repository.findByMemoryIds(["mem-1"])
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row.memoryId).toBe("mem-1")
    expect(row.provider).toBe("ollama")
    expect(row.model).toBe("nomic-embed-text")
    expect(row.dimension).toBe(3)
    expect(row.textHash).toBe("hash-1")
    expect(row.createdAt).toBeInstanceOf(Date)
    expect(row.updatedAt).toBeInstanceOf(Date)
    expect([...row.vector]).toHaveLength(3)
    expect(row.vector[0]).toBeCloseTo(0.5, 6)
    expect(row.vector[1]).toBeCloseTo(-0.25, 6)
    expect(row.vector[2]).toBeCloseTo(0.75, 6)
  })

  it("replaces the existing row when the same memory is upserted", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-1")

    await repository.upsert(baseRecord())
    await repository.upsert(
      baseRecord({
        vector: Float32Array.from([1, 0, 0]),
        textHash: "hash-2",
      }),
    )

    const rows = await repository.findByMemoryIds(["mem-1"])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.textHash).toBe("hash-2")
    expect(rows[0]?.vector[0]).toBeCloseTo(1, 6)
  })

  it("finds only the requested ids and returns an empty list for unknown ids", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-1")
    insertMemory("mem-2")
    insertMemory("mem-3")

    await repository.upsert(baseRecord({ memoryId: "mem-1" }))
    await repository.upsert(baseRecord({ memoryId: "mem-2" }))

    const rows = await repository.findByMemoryIds(["mem-1", "mem-3"])
    expect(rows.map((row) => row.memoryId).sort()).toEqual(["mem-1"])
    await expect(repository.findByMemoryIds([])).resolves.toEqual([])
  })

  it("deletes one or several rows by memory id", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-1")
    insertMemory("mem-2")
    insertMemory("mem-3")

    await repository.upsert(baseRecord({ memoryId: "mem-1" }))
    await repository.upsert(baseRecord({ memoryId: "mem-2" }))
    await repository.upsert(baseRecord({ memoryId: "mem-3" }))

    await repository.deleteByMemoryId("mem-1")
    await repository.deleteByMemoryIds(["mem-2", "mem-3"])

    await expect(
      repository.findByMemoryIds(["mem-1", "mem-2", "mem-3"]),
    ).resolves.toEqual([])
  })

  it("lists the memories without a row or with a different provider/model/dimension", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-match")
    insertMemory("mem-no-row")
    insertMemory("mem-other-model")
    insertMemory("mem-other-dimension")
    insertMemory("mem-other-provider")

    await repository.upsert(baseRecord({ memoryId: "mem-match" }))
    await repository.upsert(
      baseRecord({ memoryId: "mem-other-model", model: "mxbai-embed-large" }),
    )
    await repository.upsert(
      baseRecord({ memoryId: "mem-other-dimension", dimension: 4 }),
    )
    await repository.upsert(
      baseRecord({ memoryId: "mem-other-provider", provider: "openai-compatible" }),
    )

    const missing = await repository.listMissingForConversation("conv-1", target)

    expect(missing.sort()).toEqual([
      "mem-no-row",
      "mem-other-dimension",
      "mem-other-model",
      "mem-other-provider",
    ])
  })

  it("does not flag a row whose text hash is stale: the hash is checked by the use case", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-stale")

    await repository.upsert(
      baseRecord({ memoryId: "mem-stale", textHash: "stale-hash" }),
    )

    await expect(
      repository.listMissingForConversation("conv-1", target),
    ).resolves.toEqual([])
  })

  it("treats every memory as missing when the active dimension is null", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-1")
    insertMemory("mem-2")

    await repository.upsert(baseRecord({ memoryId: "mem-1" }))

    await expect(
      repository.listMissingForConversation("conv-1", {
        ...target,
        dimension: null,
      }),
    ).resolves.toEqual(["mem-1", "mem-2"])

    await expect(
      repository.countStatus("conv-1", { ...target, dimension: null }),
    ).resolves.toEqual({ indexed: 0, missing: 2 })
  })

  it("counts indexed and missing memories by the active provider/model/dimension", async () => {
    const repository = new DrizzleMemoryEmbeddingRepository(db)
    insertMemory("mem-valid-1")
    insertMemory("mem-valid-2")
    insertMemory("mem-no-row")
    insertMemory("mem-other-model")

    await repository.upsert(baseRecord({ memoryId: "mem-valid-1" }))
    await repository.upsert(baseRecord({ memoryId: "mem-valid-2" }))
    await repository.upsert(
      baseRecord({ memoryId: "mem-other-model", model: "mxbai-embed-large" }),
    )

    await expect(
      repository.countStatus("conv-1", target),
    ).resolves.toEqual({ indexed: 2, missing: 2 })
  })
})
