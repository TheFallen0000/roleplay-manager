import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
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
  it("backs up the database and copies only the assets", async () => {
    const root = await buildTemp()
    const dataDir = join(root, "data")
    const backupDir = join(root, "backups")
    const databasePath = join(dataDir, "roleplay.db")
    const logDir = join(dataDir, "logs")
    await mkdir(join(dataDir, "images"), { recursive: true })
    await mkdir(logDir, { recursive: true })
    await writeFile(join(dataDir, "images", "a.png"), "image-bytes")
    await writeFile(databasePath, "live-db")
    await writeFile(`${databasePath}-wal`, "wal")
    await writeFile(`${databasePath}-shm`, "shm")
    await writeFile(join(logDir, "app.1.log"), "log-entry")

    const backup = vi.fn(async (destination: string) => {
      await writeFile(destination, "db-bytes")
    })
    const service = new BackupService({
      client: { backup },
      dataDir,
      databasePath,
      logDir,
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
    expect(existsSync(join(result.path, "data", "roleplay.db"))).toBe(false)
    expect(existsSync(join(result.path, "data", "roleplay.db-wal"))).toBe(false)
    expect(existsSync(join(result.path, "data", "roleplay.db-shm"))).toBe(false)
    expect(existsSync(join(result.path, "data", "logs"))).toBe(false)
    expect(result.files).toBe(2)
    expect(result.bytes).toBe("db-bytes".length + "image-bytes".length)
  })

  it("skips the data copy when there is no data folder", async () => {
    const root = await buildTemp()
    const service = new BackupService({
      client: { backup: async (destination) => writeFile(destination, "db") },
      dataDir: join(root, "missing"),
      databasePath: join(root, "missing", "roleplay.db"),
      logDir: join(root, "missing", "logs"),
      backupDir: join(root, "backups"),
      now: () => new Date("2026-10-07T00:00:00.000Z"),
    })

    const result = await service.create()

    expect(result.files).toBe(1)
    expect(existsSync(join(result.path, "roleplay.db"))).toBe(true)
    expect(existsSync(join(result.path, "data"))).toBe(false)
  })

  it("keeps only the newest backups", async () => {
    const root = await buildTemp()
    const backupDir = join(root, "backups")
    const oldest = join(backupDir, "2026-01-01T00-00-00-000Z")
    const previous = join(backupDir, "2026-01-02T00-00-00-000Z")
    await mkdir(oldest, { recursive: true })
    await mkdir(previous, { recursive: true })

    const service = new BackupService({
      client: { backup: async (destination) => writeFile(destination, "db") },
      dataDir: join(root, "missing"),
      databasePath: join(root, "missing", "roleplay.db"),
      logDir: join(root, "missing", "logs"),
      backupDir,
      maxBackups: 2,
      now: () => new Date("2026-01-03T00:00:00.000Z"),
    })

    const result = await service.create()

    expect(existsSync(result.path)).toBe(true)
    expect(existsSync(previous)).toBe(true)
    expect(existsSync(oldest)).toBe(false)
  })
})
