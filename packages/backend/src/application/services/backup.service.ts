import { existsSync } from "node:fs"
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises"
import { isAbsolute, join, relative, resolve, sep } from "node:path"

import type { BackupResultDTO } from "@workspace/shared/types/update"

export interface BackupDatabaseClient {
  /** Online backup (better-sqlite3 `Database.backup`). */
  backup(destination: string): Promise<unknown>
}

export interface BackupServiceOptions {
  client: BackupDatabaseClient
  /** Folder with the app data (uploaded images, ...). */
  dataDir: string
  /** Live database path; its files are not duplicated inside `data/`. */
  databasePath: string
  /** Log folder; it is not copied into the backup. */
  logDir: string
  /** Where backups are written. */
  backupDir: string
  /** Timestamped backups to keep after writing a new one. */
  maxBackups?: number
  /** Injectable for tests. */
  now?: () => Date
}

const DEFAULT_MAX_BACKUPS = 10

/**
 * Creates a backup of the database (online backup, safe while running) plus a
 * copy of the uploaded assets. The live SQLite files and logs are deliberately
 * excluded: the root `roleplay.db` is the consistent copy, and duplicating the
 * WAL/SHM files would invite restoring an inconsistent database.
 */
export class BackupService {
  constructor(private readonly options: BackupServiceOptions) {}

  async create(): Promise<BackupResultDTO> {
    const timestamp = (this.options.now?.() ?? new Date())
      .toISOString()
      .replace(/[:.]/g, "-")
    const target = join(this.options.backupDir, timestamp)
    await mkdir(target, { recursive: true })

    await this.options.client.backup(join(target, "roleplay.db"))

    if (existsSync(this.options.dataDir)) {
      await this.copyData(target)
    }

    await pruneOldBackups(
      this.options.backupDir,
      this.options.maxBackups ?? DEFAULT_MAX_BACKUPS,
    )

    const { files, bytes } = await measure(target)
    return { path: target, files, bytes }
  }

  private async copyData(target: string): Promise<void> {
    const dataRoot = resolve(this.options.dataDir)
    const databasePath = resolve(this.options.databasePath)
    const relativeDatabase = relative(dataRoot, databasePath)
    const excluded = new Set<string>()

    if (
      relativeDatabase &&
      !relativeDatabase.startsWith("..") &&
      !isAbsolute(relativeDatabase)
    ) {
      for (const suffix of ["", "-wal", "-shm", "-journal"]) {
        excluded.add(`${relativeDatabase}${suffix}`)
      }
    }

    const logRoot = resolve(this.options.logDir)
    const logInsideData =
      logRoot !== dataRoot && logRoot.startsWith(`${dataRoot}${sep}`)

    await cp(dataRoot, join(target, "data"), {
      recursive: true,
      filter: (source) => {
        const relativeSource = relative(dataRoot, source)
        if (!relativeSource) return true
        if (excluded.has(relativeSource)) return false
        if (
          logInsideData &&
          (source === logRoot || source.startsWith(`${logRoot}${sep}`))
        ) {
          return false
        }
        return true
      },
    })
  }
}

/** Keeps the newest timestamped folders; cleanup is best-effort. */
const pruneOldBackups = async (
  backupDir: string,
  maxBackups: number,
): Promise<void> => {
  if (maxBackups <= 0) return

  try {
    const entries = await readdir(backupDir, { withFileTypes: true })
    const names = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse()

    await Promise.all(
      names
        .slice(maxBackups)
        .map((name) => rm(join(backupDir, name), { recursive: true, force: true })),
    )
  } catch {
    // A failed cleanup must not invalidate a backup that was already written.
  }
}

const measure = async (
  directory: string,
): Promise<{ files: number; bytes: number }> => {
  let files = 0
  let bytes = 0

  const walk = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      files += 1
      bytes += (await stat(full)).size
    }
  }

  await walk(directory)
  return { files, bytes }
}
