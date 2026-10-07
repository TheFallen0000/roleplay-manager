import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { BackupService } from "./backup.service"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

const buildTemp = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "rm-backup-"))
  tempDirs.push(dir)
  return dir
}

describe("BackupService", () => {
  it("backs up the database and copies the data folder", async () => {
    const root = await buildTemp()
    const dataDir = join(root, "data")
    const backupDir = join(root, "backups")
    await mkdir(join(dataDir, "images"), { recursive: true })
    await writeFile(join(dataDir, "images", "a.png"), "image-bytes")

    const backup = vi.fn(async (destination: string) => {
      await writeFile(destination, "db-bytes")
    })
    const service = new BackupService({
      client: { backup },
      dataDir,
      backupDir,
      now: () => new Date("2026-10-07T10:20:30.000Z"),
    })

    const result = await service.create()

    expect(backup).toHaveBeenCalledWith(
      join(backupDir, "2026-10-07T10-20-30-000Z", "roleplay.db"),
    )
    expect(existsSync(join(result.path, "roleplay.db"))).toBe(true)
    expect(
      await readFile(join(result.path, "data", "images", "a.png"), "utf8"),
    ).toBe("image-bytes")
    expect(result.files).toBe(2)
    expect(result.bytes).toBe("db-bytes".length + "image-bytes".length)
  })

  it("skips the data copy when there is no data folder", async () => {
    const root = await buildTemp()
    const service = new BackupService({
      client: { backup: async (destination) => writeFile(destination, "db") },
      dataDir: join(root, "missing"),
      backupDir: join(root, "backups"),
      now: () => new Date("2026-10-07T00:00:00.000Z"),
    })

    const result = await service.create()

    expect(result.files).toBe(1)
    expect(existsSync(join(result.path, "roleplay.db"))).toBe(true)
    expect(existsSync(join(result.path, "data"))).toBe(false)
  })
})
