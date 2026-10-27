import { chmodSync, existsSync, mkdirSync } from "node:fs"

const IS_WINDOWS = process.platform === "win32"

/**
 * Apply a private umask before the app creates its database, images, logs or
 * backups. Windows uses ACLs and BitLocker instead of POSIX modes.
 */
export const applyProcessUmask = (): void => {
  if (!IS_WINDOWS) process.umask(0o077)
}

/** Creates a directory if needed and prevents other local users from reading it. */
export const ensurePrivateDirectory = (directory: string): void => {
  if (IS_WINDOWS) {
    mkdirSync(directory, { recursive: true })
    return
  }
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  try {
    chmodSync(directory, 0o700)
  } catch {
    // Read-only or foreign filesystems may not support chmod.
  }
}

/** Restricts a file to its owner after SQLite has created or opened it. */
export const ensurePrivateFile = (file: string): void => {
  if (IS_WINDOWS || !existsSync(file)) return
  try {
    chmodSync(file, 0o600)
  } catch {
    // The app can still run if the filesystem does not support chmod.
  }
}

/** SQLite keeps the database plus WAL/SHM sidecars; protect all of them. */
export const ensurePrivateDatabaseFiles = (databasePath: string): void => {
  for (const suffix of ["", "-wal", "-shm"]) {
    ensurePrivateFile(`${databasePath}${suffix}`)
  }
}
