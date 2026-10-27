import { mkdtemp, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import {
  applyProcessUmask,
  ensurePrivateDatabaseFiles,
  ensurePrivateDirectory,
} from "./permissions"

const roots: string[] = []

afterAll(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  )
})

const mode = async (path: string): Promise<number> =>
  (await stat(path)).mode & 0o777

describe.skipIf(process.platform === "win32")("private filesystem modes", () => {
  it("creates data directories with owner-only permissions", async () => {
    const root = await mkdtemp(join(tmpdir(), "rm-permissions-"))
    roots.push(root)
    const data = join(root, "data")

    ensurePrivateDirectory(data)

    expect(await mode(data)).toBe(0o700)
  })

  it("tightens an existing database file and its WAL sidecars", async () => {
    const root = await mkdtemp(join(tmpdir(), "rm-permissions-"))
    roots.push(root)
    const database = join(root, "roleplay.db")
    await writeFile(database, "", { mode: 0o644 })
    await writeFile(`${database}-wal`, "", { mode: 0o644 })

    ensurePrivateDatabaseFiles(database)

    expect(await mode(database)).toBe(0o600)
    expect(await mode(`${database}-wal`)).toBe(0o600)
  })

  it("applies a private process umask", () => {
    const previous = process.umask(0o022)
    try {
      applyProcessUmask()
      expect(process.umask()).toBe(0o077)
    } finally {
      process.umask(previous)
    }
  })
})
