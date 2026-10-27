import { dirname, resolve } from "node:path"

import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"

import * as schema from "../adapters/secondary/drizzle/schema"
import {
  ensurePrivateDatabaseFiles,
  ensurePrivateDirectory,
} from "./permissions"

export type Database = BetterSQLite3Database<typeof schema>

export const buildDatabase = (databasePath: string): Database => {
  const absolutePath = resolve(databasePath)
  const dir = dirname(absolutePath)
  ensurePrivateDirectory(dir)
  const sqlite = new Database(absolutePath)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  ensurePrivateDatabaseFiles(absolutePath)
  return drizzle(sqlite, { schema })
}

export const runMigrations = (
  db: Database,
  migrationsDir?: string,
): void => {
  const migrationsFolder =
    migrationsDir ??
    resolve(import.meta.dirname, "..", "database", "migrations")
  migrate(db, { migrationsFolder })
}
