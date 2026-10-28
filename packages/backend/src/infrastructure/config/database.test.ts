import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import { buildDatabase } from "./database"

const root = await mkdtemp(join(tmpdir(), "rm-database-"))
const db = buildDatabase(join(root, "test.db"))
const client = (
  db as unknown as {
    $client: {
      pragma: (name: string, options?: { simple: boolean }) => unknown
      close: () => void
    }
  }
).$client

afterAll(() => {
  client.close()
  return rm(root, { recursive: true, force: true })
})

describe("buildDatabase", () => {
  it("uses WAL, foreign keys and the tuning pragmas", () => {
    expect(client.pragma("journal_mode", { simple: true })).toBe("wal")
    expect(client.pragma("foreign_keys", { simple: true })).toBe(1)
    expect(client.pragma("busy_timeout", { simple: true })).toBe(5000)
    expect(client.pragma("cache_size", { simple: true })).toBe(-16000)
  })
})
