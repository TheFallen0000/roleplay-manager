import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { MemoryType } from "@workspace/shared/types/memory"

import { buildDatabase, runMigrations } from "../../../../config/database"
import { Memory } from "../../../../../domain/entities/memory.entity"
import { DrizzleMemoryRepository } from "./drizzle-memory.repository"

const root = mkdtempSync(join(tmpdir(), "rm-memory-repository-"))
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

const buildMemory = (
  overrides: {
    id?: string
    actor?: string
    title?: string
    type?: MemoryType
  } = {},
): Memory =>
  Memory.create({
    id: "mem-1",
    conversationId: "conv-1",
    actor: "Lyra",
    title: "Misión",
    description: "Debe proteger el bosque.",
    priority: 7,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })

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

beforeAll(() => {
  runMigrations(db)
  seedConversation()
})

beforeEach(() => {
  sqlite.prepare("DELETE FROM memories").run()
})

afterAll(() => {
  sqlite.close()
  rmSync(root, { recursive: true, force: true })
})

describe("DrizzleMemoryRepository", () => {
  it("persists and reads the memory type", async () => {
    const repository = new DrizzleMemoryRepository(db)

    await repository.create(
      buildMemory({ id: "mem-episode", title: "Episodio", type: "episode" }),
    )
    await repository.create(
      buildMemory({ id: "mem-thread", title: "Hilo", type: "thread" }),
    )
    await repository.create(
      buildMemory({ id: "mem-default", title: "Hecho" }),
    )

    const memories = await repository.findByConversationId("conv-1")
    const byId = new Map(memories.map((memory) => [memory.id, memory]))

    expect(byId.get("mem-episode")?.type).toBe("episode")
    expect(byId.get("mem-thread")?.type).toBe("thread")
    expect(byId.get("mem-default")?.type).toBe("fact")
  })

  it("persists a type change on update", async () => {
    const repository = new DrizzleMemoryRepository(db)
    const memory = buildMemory({ id: "mem-update", type: "fact" })
    await repository.create(memory)

    await repository.update(memory.update({ type: "thread" }, "user"))

    const reloaded = await repository.findById("mem-update")
    expect(reloaded?.type).toBe("thread")
  })

  it("allows the same title for different actors", async () => {
    const repository = new DrizzleMemoryRepository(db)

    await expect(
      repository.create(
        buildMemory({ id: "mem-lyra", actor: "Lyra", title: "Misión" }),
      ),
    ).resolves.toBeDefined()
    await expect(
      repository.create(
        buildMemory({ id: "mem-kael", actor: "Kael", title: "Misión" }),
      ),
    ).resolves.toBeDefined()
  })

  it("rejects a duplicate title for the same actor", async () => {
    const repository = new DrizzleMemoryRepository(db)

    await repository.create(
      buildMemory({ id: "mem-dup-1", actor: "Selene", title: "Secreto" }),
    )

    await expect(
      repository.create(
        buildMemory({ id: "mem-dup-2", actor: "Selene", title: "Secreto" }),
      ),
    ).rejects.toThrow()
  })
})
