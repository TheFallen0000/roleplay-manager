import { existsSync } from "node:fs"
import { cp, mkdir, readdir, stat } from "node:fs/promises"
import { join } from "node:path"

import type { BackupResultDTO } from "@workspace/shared/types/update"

export interface BackupDatabaseClient {
  /** Online backup (better-sqlite3 `Database.backup`). */
  backup(destination: string): Promise<unknown>
}

export interface BackupServiceOptions {
  client: BackupDatabaseClient
  /** Folder with the app data (uploaded images, ...). */
  dataDir: string
  /** Where backups are written. */
  backupDir: string
  /** Injectable for tests. */
  now?: () => Date
}

/**
 * Creates a backup of the database (online backup, safe while running) plus a
 * copy of the data folder, inside `backupDir/<timestamp>/`.
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
      await cp(this.options.dataDir, join(target, "data"), {
        recursive: true,
      })
    }

    const { files, bytes } = await measure(target)
    return { path: target, files, bytes }
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
