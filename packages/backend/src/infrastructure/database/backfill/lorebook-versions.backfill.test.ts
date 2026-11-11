import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { NormalizedLorebook } from "../../../../application/use-cases/character/lorebook/lorebook.mapper"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "../../../../application/use-cases/character/lorebook/source-key"
import { buildDatabase, runMigrations } from "../../../config/database"
import { runLorebookVersionsBackfill } from "./lorebook-versions.backfill"

const root = mkdtempSync(join(tmpdir(), "rm-lorebook-backfill-"))
const db = buildDatabase(join(root, "test.db"))
const sqlite = (
  db as unknown as {
    $client: {
      prepare: (sql: string) => {
        all: (...params: unknown[]) => Record<string, unknown>[]
        get: (...params: unknown[]) => Record<string, unknown> | undefined
        run: (...params: unknown[]) => unknown
      }
      close: () => void
    }
  }
).$client

const now = 1_790_000_000

const insertCharacter = (id: string, name: string): void => {
  sqlite
    .prepare(
      "INSERT INTO characters (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(id, name, now, now)
}

const insertCharacterVersion = (
  id: string,
  characterId: string,
  versionNumber: number,
): void => {
  sqlite
    .prepare(
      `INSERT INTO character_versions
        (id, character_id, name, description, greeting, version_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      characterId,
      "Lyra",
      "A guardian of the forest.",
      "Hello, traveler.",
      versionNumber,
      now,
    )
}

const insertBook = (id: string, characterId: string | null): void => {
  sqlite
    .prepare(
      `INSERT INTO lorebooks
        (id, character_id, name, description, scan_depth, token_budget,
         recursive_scanning, extensions, unknown_fields, created_at, updated_at,
         origin_id, current_version_id, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`,
    )
    .run(
      id,
      characterId,
      "Forest lore",
      "Facts about the forest",
      8,
      900,
      1,
      "{}",
      null,
      now,
      now,
    )
}

const insertEntry = (
  id: string,
  bookId: string,
  order: number,
  content: string,
  keys: string[],
): void => {
  sqlite
    .prepare(
      `INSERT INTO lorebook_entries
        (id, lorebook_id, name, source_id, keys, secondary_keys, comment, content,
         constant, selective, selective_logic, insertion_order, position,
         raw_position, priority, enabled, case_sensitive, whole_words, "order",
         extensions, unknown_fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      bookId,
      keys[0] === "dragon" ? "Dragon lore" : "River lore",
      String(order + 1),
      JSON.stringify(keys),
      "[]",
      keys[0] === "dragon" ? "Dragon lore" : "River lore",
      content,
      0,
      0,
      0,
      100,
      "after_char",
      String(order + 1),
      0,
      1,
      0,
      0,
      order,
      "{}",
      null,
      now,
      now,
    )
}

const normalizedHead = (): NormalizedLorebook => ({
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 8,
  tokenBudget: 900,
  recursiveScanning: true,
  extensions: {},
  unknownFields: null,
  entries: [
    {
      name: "Dragon lore",
      sourceId: "1",
      keys: ["dragon"],
      secondaryKeys: [],
      comment: "Dragon lore",
      content: "Dragons dwell in the northern mountains.",
      constant: false,
      selective: false,
      selectiveLogic: 0,
      insertionOrder: 100,
      position: "after_char",
      rawPosition: "1",
      priority: 0,
      enabled: true,
      caseSensitive: false,
      wholeWords: false,
      order: 0,
      extensions: {},
      unknownFields: null,
    },
    {
      name: "River lore",
      sourceId: "2",
      keys: ["river"],
      secondaryKeys: [],
      comment: "River lore",
      content: "The river is old.",
      constant: false,
      selective: false,
      selectiveLogic: 0,
      insertionOrder: 100,
      position: "after_char",
      rawPosition: "2",
      priority: 0,
      enabled: true,
      caseSensitive: false,
      wholeWords: false,
      order: 1,
      extensions: {},
      unknownFields: null,
    },
  ],
})

const versionsFor = (bookId: string): Array<Record<string, unknown>> =>
  sqlite
    .prepare(
      "SELECT * FROM lorebook_versions WHERE lorebook_id = ? ORDER BY version_number",
    )
    .all(bookId)

const bookRow = (bookId: string): Record<string, unknown> | undefined =>
  sqlite.prepare("SELECT * FROM lorebooks WHERE id = ?").get(bookId)

describe("lorebook versions backfill", () => {
  beforeAll(() => {
    runMigrations(db)

    insertCharacter("char-1", "Lyra")
    insertCharacterVersion("ver-1", "char-1", 1)
    insertCharacterVersion("ver-2", "char-1", 2)
    insertBook("book-1", "char-1")
    insertEntry(
      "entry-1",
      "book-1",
      0,
      "Dragons dwell in the northern mountains.",
      ["dragon"],
    )
    insertEntry("entry-2", "book-1", 1, "The river is old.", ["river"])

    insertCharacter("char-2", "Kael")
    insertCharacterVersion("ver-3", "char-2", 1)
    insertBook("book-2", "char-2")
    insertEntry("entry-3", "book-2", 0, "Kael's lore.", ["kael"])
  })

  afterAll(() => {
    sqlite.close()
    rmSync(root, { recursive: true, force: true })
  })

  it("creates v1, points current_version_id and links every character version", () => {
    runLorebookVersionsBackfill(db)

    const versions = versionsFor("book-1")
    expect(versions).toHaveLength(1)
    expect(versions[0]).toMatchObject({
      lorebook_id: "book-1",
      version_number: 1,
      name: "Forest lore",
      scan_depth: 8,
      token_budget: 900,
    })

    const expectedKey = computeLorebookSourceKey(
      canonicalizeLorebookContent(normalizedHead()),
    )
    expect(versions[0].source_key).toBe(expectedKey)

    const entries = JSON.parse(String(versions[0].entries_json)) as Array<
      Record<string, unknown>
    >
    expect(entries.map((entry) => entry.content)).toEqual([
      "Dragons dwell in the northern mountains.",
      "The river is old.",
    ])

    const book = bookRow("book-1")
    expect(book?.current_version_id).toBe(versions[0].id)
    expect(book?.origin_id).toEqual(expect.any(String))
    expect(book?.character_id).toBeNull()

    const linked = sqlite
      .prepare(
        "SELECT id, lorebook_version_id FROM character_versions WHERE character_id = ?",
      )
      .all("char-1")
    expect(linked).toHaveLength(2)
    for (const row of linked) {
      expect(row.lorebook_version_id).toBe(versions[0].id)
    }
  })

  it("is idempotent on a second run", () => {
    runLorebookVersionsBackfill(db)

    expect(versionsFor("book-1")).toHaveLength(1)
    const book = bookRow("book-1")
    const linked = sqlite
      .prepare(
        "SELECT lorebook_version_id FROM character_versions WHERE character_id = ?",
      )
      .all("char-1")
    for (const row of linked) {
      expect(row.lorebook_version_id).toBe(book?.current_version_id)
    }
  })

  it("repairs a partial failure by reusing the existing v1", () => {
    // Simulate a crash after inserting v1 but before linking the container.
    sqlite
      .prepare(
        `INSERT INTO lorebook_versions
          (id, lorebook_id, version_number, name, description, scan_depth,
           token_budget, recursive_scanning, entries_json, source_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "book-2-v1",
        "book-2",
        1,
        "Forest lore",
        "Facts about the forest",
        8,
        900,
        1,
        "[]",
        "seeded-source-key",
        now,
      )

    runLorebookVersionsBackfill(db)

    const versions = versionsFor("book-2")
    expect(versions).toHaveLength(1)
    expect(versions[0].id).toBe("book-2-v1")

    const book = bookRow("book-2")
    expect(book?.current_version_id).toBe("book-2-v1")
    expect(book?.character_id).toBeNull()

    const linked = sqlite
      .prepare(
        "SELECT lorebook_version_id FROM character_versions WHERE character_id = ?",
      )
      .all("char-2")
    expect(linked).toEqual([{ lorebook_version_id: "book-2-v1" }])
  })
})
