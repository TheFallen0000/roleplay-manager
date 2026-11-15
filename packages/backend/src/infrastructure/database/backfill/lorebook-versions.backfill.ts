import { v7 as randomUUIDv7 } from "uuid"

import type {
  NormalizedLorebook,
  NormalizedLorebookEntry,
} from "../../../application/use-cases/character/lorebook/lorebook.mapper"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "../../../application/use-cases/character/lorebook/source-key"
import type { Database } from "../../config/database"
import {
  parseJsonArray,
  parseJsonValue,
} from "../../adapters/secondary/drizzle/repositories/json-column"

type Row = Record<string, unknown>

interface RawStatement {
  all: (...params: unknown[]) => Row[]
  get: (...params: unknown[]) => Row | undefined
  run: (...params: unknown[]) => unknown
}

interface RawDatabase {
  prepare: (sql: string) => RawStatement
  transaction: <T>(fn: () => T) => () => T
}

const asString = (value: unknown): string =>
  typeof value === "string" ? value : ""

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const asInteger = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) ? value : fallback

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  value === 1 || value === true ? true : value === 0 || value === false ? false : fallback

const asPosition = (value: unknown): "before_char" | "after_char" =>
  value === "before_char" ? "before_char" : "after_char"

const readEntry = (row: Row): NormalizedLorebookEntry => ({
  name: asNullableString(row.name),
  sourceId: asNullableString(row.source_id),
  keys: parseJsonArray(asNullableString(row.keys)),
  secondaryKeys: parseJsonArray(asNullableString(row.secondary_keys)),
  comment: asNullableString(row.comment),
  content: asString(row.content),
  constant: asBoolean(row.constant, false),
  selective: asBoolean(row.selective, false),
  selectiveLogic: asInteger(row.selective_logic, 0) as 0 | 1 | 2 | 3,
  insertionOrder: asInteger(row.insertion_order, 100),
  position: asPosition(row.position),
  rawPosition: asNullableString(row.raw_position),
  priority: asInteger(row.priority, 0),
  enabled: asBoolean(row.enabled, true),
  caseSensitive: asBoolean(row.case_sensitive, false),
  wholeWords: asBoolean(row.whole_words, false),
  order: asInteger(row.order, 0),
  extensions: parseJsonValue(asNullableString(row.extensions)),
  unknownFields: parseJsonValue(asNullableString(row.unknown_fields)),
})

const readEntries = (sqlite: RawDatabase, lorebookId: string): NormalizedLorebookEntry[] =>
  sqlite
    .prepare(
      `SELECT * FROM lorebook_entries
       WHERE lorebook_id = ?
       ORDER BY "order" ASC, insertion_order ASC`,
    )
    .all(lorebookId)
    .map(readEntry)

const readHead = (book: Row, entries: NormalizedLorebookEntry[]): NormalizedLorebook => ({
  name: asNullableString(book.name),
  description: asNullableString(book.description),
  scanDepth: asInteger(book.scan_depth, 4),
  tokenBudget: asInteger(book.token_budget, 400),
  recursiveScanning: asBoolean(book.recursive_scanning, false),
  extensions: parseJsonValue(asNullableString(book.extensions)),
  unknownFields: parseJsonValue(asNullableString(book.unknown_fields)),
  entries,
})

/**
 * Creates the first immutable version for every live lorebook head that still
 * lacks one, links all character versions of its legacy owner and clears the
 * legacy `character_id`. Idempotent and self-repairing: an existing v1 is
 * reused instead of duplicated.
 */
export const runLorebookVersionsBackfill = (db: Database): void => {
  const sqlite = (db as unknown as { $client: RawDatabase }).$client

  const backfill = sqlite.transaction(() => {
    const pending = sqlite
      .prepare(
        `SELECT * FROM lorebooks
         WHERE current_version_id IS NULL
         ORDER BY created_at ASC, id ASC`,
      )
      .all()

    const findVersion = sqlite.prepare(
      `SELECT id FROM lorebook_versions
       WHERE lorebook_id = ? AND version_number = 1
       LIMIT 1`,
    )

    const insertVersion = sqlite.prepare(
      `INSERT INTO lorebook_versions
        (id, lorebook_id, version_number, name, description, scan_depth,
         token_budget, recursive_scanning, entries_json, source_key, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    const updateContainer = sqlite.prepare(
      `UPDATE lorebooks
       SET current_version_id = ?,
           origin_id = COALESCE(origin_id, ?),
           updated_at = ?
       WHERE id = ?`,
    )

    const linkCharacterVersions = sqlite.prepare(
      `UPDATE character_versions
       SET lorebook_version_id = ?
       WHERE character_id = ?`,
    )

    const clearLegacyCharacter = sqlite.prepare(
      `UPDATE lorebooks SET character_id = NULL WHERE id = ?`,
    )

    const now = Math.floor(Date.now() / 1000)

    for (const book of pending) {
      const bookId = asString(book.id)
      const entries = readEntries(sqlite, bookId)
      const head = readHead(book, entries)
      const entriesJson = JSON.stringify(entries)
      const sourceKey = computeLorebookSourceKey(
        canonicalizeLorebookContent(head),
      )

      const existing = findVersion.get(bookId)
      let versionId = asNullableString(existing?.id)

      if (versionId === null) {
        versionId = randomUUIDv7()
        insertVersion.run(
          versionId,
          bookId,
          head.name,
          head.description,
          head.scanDepth,
          head.tokenBudget,
          head.recursiveScanning ? 1 : 0,
          entriesJson,
          sourceKey,
          now,
        )
      }

      const legacyCharacterId = asNullableString(book.character_id)
      if (legacyCharacterId !== null) {
        linkCharacterVersions.run(versionId, legacyCharacterId)
      }

      updateContainer.run(
        versionId,
        asNullableString(book.origin_id) ?? randomUUIDv7(),
        now,
        bookId,
      )
      clearLegacyCharacter.run(bookId)
    }
  })

  backfill()
}
