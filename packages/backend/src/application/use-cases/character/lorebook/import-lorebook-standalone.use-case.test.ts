import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { DrizzleLorebookRepository } from "../../../../infrastructure/adapters/secondary/drizzle/repositories/drizzle-lorebook.repository"
import {
  characterVersions,
  characters,
} from "../../../../infrastructure/adapters/secondary/drizzle/schema"
import { buildDatabase, runMigrations } from "../../../../infrastructure/config/database"
import {
  buildCCv3ImportPayload,
  buildStNativeImportPayload,
  LOREBOOK_FIXTURE_NOW,
} from "../../../../test-utils/lorebook-fixtures"

import {
  buildLorebookEntities,
  serializeLorebookEntries,
  toLorebookCanonicalContent,
} from "./lorebook.mapper"
import { ImportLorebookPreviewUseCase } from "./import-lorebook-preview.use-case"
import { ImportLorebookStandaloneUseCase } from "./import-lorebook-standalone.use-case"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "./source-key"

const root = mkdtempSync(join(tmpdir(), "rm-import-lorebook-standalone-"))
const db = buildDatabase(join(root, "test.db"))
const client = (
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

const now = LOREBOOK_FIXTURE_NOW

const reset = (): void => {
  client.prepare("DELETE FROM character_versions").run()
  client.prepare("DELETE FROM lorebook_versions").run()
  client.prepare("DELETE FROM lorebook_entries").run()
  client.prepare("DELETE FROM lorebooks").run()
  client.prepare("DELETE FROM characters").run()
}

const repository = () => new DrizzleLorebookRepository(db)

const count = (table: string): number => {
  const row = client
    .prepare(`SELECT COUNT(*) AS total FROM ${table}`)
    .get() as { total: number } | undefined
  return Number(row?.total ?? 0)
}

const rowsFor = (table: string): Array<Record<string, unknown>> =>
  client.prepare(`SELECT * FROM ${table}`).all()

const seedBookFromPayload = async (
  payload: string,
  options: {
    bookId: string
    originId?: string | null
    deletedAt?: Date | null
  },
) => {
  // Standalone import has no owning character: `buildLorebookEntities` must
  // accept `string | null` for this path.
  const entities = buildLorebookEntities(JSON.parse(payload), null, {
    bookId: options.bookId,
    now,
  })
  if (!entities) throw new Error("The fixture payload has no lorebook")

  const book = entities.book
    .withOriginId(options.originId ?? null)
    .withDeletedAt(options.deletedAt ?? null)
  const version = {
    id: `${options.bookId}-v1`,
    lorebookId: options.bookId,
    versionNumber: 1,
    name: book.name,
    description: book.description,
    scanDepth: book.scanDepth,
    tokenBudget: book.tokenBudget,
    recursiveScanning: book.recursiveScanning,
    entriesJson: serializeLorebookEntries(entities.entries),
    sourceKey: computeLorebookSourceKey(
      canonicalizeLorebookContent(
        toLorebookCanonicalContent(book, entities.entries),
      ),
    ),
    createdAt: now,
  }

  return repository().createContainerWithVersion(
    book,
    entities.entries,
    version as never,
  )
}

const seedLinkedCharacterVersion = async (lorebookVersionId: string) => {
  await db.insert(characters).values({
    id: "char-1",
    name: "Lyra",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(characterVersions).values({
    id: "cv-1",
    characterId: "char-1",
    name: "Lyra",
    description: "A guardian of the forest.",
    greeting: "Hello, traveler.",
    versionNumber: 1,
    createdAt: now,
    lorebookVersionId,
  })
}

const preview = async (
  payload: string,
  format: "ccv3" | "st-native" = "ccv3",
) =>
  new ImportLorebookPreviewUseCase({
    lorebookRepository: repository(),
  } as never).execute({ format, payload })

const importBook = async (
  payload: string,
  action: "reuse" | "restore" | "new-version" | "new-book",
  format: "ccv3" | "st-native" = "ccv3",
) =>
  new ImportLorebookStandaloneUseCase({
    lorebookRepository: repository(),
  } as never).execute({ format, payload, action })

const capture = async (
  promise: Promise<unknown>,
): Promise<{ code?: string; statusCode?: number } | null> => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { code?: string; statusCode?: number }
  }
}

beforeAll(() => {
  runMigrations(db)
})

beforeEach(() => {
  reset()
})

afterAll(() => {
  client.close()
  rmSync(root, { recursive: true, force: true })
})

describe("ImportLorebookPreviewUseCase — matching", () => {
  it("suggests reuse for a live book matched by origin_id", async () => {
    const payload = buildCCv3ImportPayload({ originId: "origin-live" })
    const saved = await seedBookFromPayload(payload, {
      bookId: "book-live",
      originId: "origin-live",
    })
    await seedLinkedCharacterVersion(saved.version.id)

    const result = await preview(payload)

    expect(result.matched).toBe(true)
    expect(result.suggestedAction).toBe("reuse")
    expect(result.book).toMatchObject({
      id: "book-live",
      deleted: false,
      usedByCharacters: 1,
    })
  })

  it("suggests restore for a deleted book matched by origin_id", async () => {
    const payload = buildCCv3ImportPayload({ originId: "origin-deleted" })
    await seedBookFromPayload(payload, {
      bookId: "book-deleted",
      originId: "origin-deleted",
      deletedAt: now,
    })

    const result = await preview(payload)

    expect(result.matched).toBe(true)
    expect(result.suggestedAction).toBe("restore")
    expect(result.book).toMatchObject({ id: "book-deleted", deleted: true })
  })

  it("suggests new-version for a live book with different content", async () => {
    const original = buildCCv3ImportPayload({
      originId: "origin-live",
      name: "Forest lore",
      content: "Original content.",
    })
    const incoming = buildCCv3ImportPayload({
      originId: "origin-live",
      name: "Forest lore",
      content: "Changed content.",
    })
    await seedBookFromPayload(original, {
      bookId: "book-live",
      originId: "origin-live",
    })

    const result = await preview(incoming)

    expect(result.matched).toBe(true)
    expect(result.suggestedAction).toBe("new-version")
    expect(result.book).toMatchObject({ id: "book-live", deleted: false })
  })

  it("suggests new-book for a deleted book with different content", async () => {
    const original = buildCCv3ImportPayload({
      originId: "origin-deleted",
      name: "Forest lore",
      content: "Original content.",
    })
    const incoming = buildCCv3ImportPayload({
      originId: "origin-deleted",
      name: "Forest lore",
      content: "Changed content.",
    })
    await seedBookFromPayload(original, {
      bookId: "book-deleted",
      originId: "origin-deleted",
      deletedAt: now,
    })

    const result = await preview(incoming)

    expect(result.suggestedAction).toBe("new-book")
    if (result.book) {
      expect(result.book.deleted).toBe(true)
    }
  })

  it("matches live and deleted books by source_key when origin_id is absent", async () => {
    const payload = buildCCv3ImportPayload({ name: "Manual lore" })
    await seedBookFromPayload(payload, {
      bookId: "book-manual-live",
      originId: null,
    })

    const live = await preview(payload)
    expect(live.suggestedAction).toBe("reuse")
    expect(live.book?.id).toBe("book-manual-live")

    reset()
    await seedBookFromPayload(payload, {
      bookId: "book-manual-deleted",
      originId: null,
      deletedAt: now,
    })

    const deleted = await preview(payload)
    expect(deleted.suggestedAction).toBe("restore")
    expect(deleted.book?.id).toBe("book-manual-deleted")
  })

  it("suggests new-book when nothing matches", async () => {
    const result = await preview(
      buildCCv3ImportPayload({ originId: "origin-unknown" }),
    )

    expect(result.matched).toBe(false)
    expect(result.suggestedAction).toBe("new-book")
  })

  it("matches an ST native payload by origin_id", async () => {
    const payload = buildStNativeImportPayload({ originId: "origin-st" })
    await seedBookFromPayload(payload, {
      bookId: "book-st",
      originId: "origin-st",
    })

    const result = await preview(payload, "st-native")

    expect(result.suggestedAction).toBe("reuse")
    expect(result.book?.id).toBe("book-st")
  })
})

describe("ImportLorebookStandaloneUseCase — actions", () => {
  it("reuse does not write anything", async () => {
    const payload = buildCCv3ImportPayload({ originId: "origin-live" })
    await seedBookFromPayload(payload, {
      bookId: "book-live",
      originId: "origin-live",
    })
    const before = {
      books: count("lorebooks"),
      versions: count("lorebook_versions"),
    }

    await importBook(payload, "reuse")

    expect(count("lorebooks")).toBe(before.books)
    expect(count("lorebook_versions")).toBe(before.versions)
  })

  it("restore clears deleted_at without creating versions", async () => {
    const payload = buildCCv3ImportPayload({ originId: "origin-deleted" })
    const saved = await seedBookFromPayload(payload, {
      bookId: "book-deleted",
      originId: "origin-deleted",
      deletedAt: now,
    })
    await seedLinkedCharacterVersion(saved.version.id)
    const before = {
      books: count("lorebooks"),
      versions: count("lorebook_versions"),
    }

    await importBook(payload, "restore")

    const bookRow = rowsFor("lorebooks").find(
      (row) => row.id === "book-deleted",
    )
    expect(bookRow?.deleted_at).toBeNull()
    expect(count("lorebooks")).toBe(before.books)
    expect(count("lorebook_versions")).toBe(before.versions)
    const characterVersion = rowsFor("character_versions")[0]
    expect(characterVersion.lorebook_version_id).toBe(saved.version.id)
  })

  it("new-version updates the live head and current_version_id", async () => {
    const original = buildCCv3ImportPayload({
      originId: "origin-live",
      content: "Original content.",
    })
    const incoming = buildCCv3ImportPayload({
      originId: "origin-live",
      content: "Changed content.",
    })
    await seedBookFromPayload(original, {
      bookId: "book-live",
      originId: "origin-live",
    })

    await importBook(incoming, "new-version")

    const versions = rowsFor("lorebook_versions")
      .filter((row) => row.lorebook_id === "book-live")
      .sort(
        (left, right) =>
          Number(left.version_number) - Number(right.version_number),
      )
    expect(versions).toHaveLength(2)
    expect(versions[1].version_number).toBe(2)
    const bookRow = rowsFor("lorebooks").find((row) => row.id === "book-live")
    expect(bookRow?.current_version_id).toBe(versions[1].id)

    const found = await repository().findById("book-live")
    expect(found?.entries.map((entry) => entry.content)).toEqual([
      "Changed content.",
    ])
  })

  it("new-book creates a container with v1", async () => {
    const payload = buildCCv3ImportPayload({
      originId: "origin-new",
      name: "New lore",
    })

    await importBook(payload, "new-book")

    expect(count("lorebooks")).toBe(1)
    expect(count("lorebook_versions")).toBe(1)
    const version = rowsFor("lorebook_versions")[0]
    expect(version.version_number).toBe(1)
    const book = rowsFor("lorebooks")[0]
    expect(book.name).toBe("New lore")
    expect(book.current_version_id).toBe(version.id)
  })

  it("new-book uses a fresh origin_id when a deleted book has different content", async () => {
    const original = buildCCv3ImportPayload({
      originId: "origin-collision",
      name: "Original lore",
      content: "Original content.",
    })
    const incoming = buildCCv3ImportPayload({
      originId: "origin-collision",
      name: "Incoming lore",
      content: "Incoming content.",
    })
    await seedBookFromPayload(original, {
      bookId: "book-deleted",
      originId: "origin-collision",
      deletedAt: now,
    })

    await importBook(incoming, "new-book")

    const books = rowsFor("lorebooks")
    expect(books).toHaveLength(2)
    const oldBook = books.find((row) => row.id === "book-deleted")
    const newBook = books.find((row) => row.id !== "book-deleted")
    expect(oldBook?.origin_id).toBe("origin-collision")
    expect(oldBook?.deleted_at).not.toBeNull()
    expect(newBook?.deleted_at).toBeNull()
    expect(newBook?.name).toBe("Incoming lore")
    expect(newBook?.origin_id).toBeTruthy()
    expect(newBook?.origin_id).not.toBe("origin-collision")
  })
})

describe("ImportLorebookStandaloneUseCase — negative paths", () => {
  it("rejects an incompatible action with IMPORT_ACTION_MISMATCH", async () => {
    const payload = buildCCv3ImportPayload({ originId: "origin-live" })
    await seedBookFromPayload(payload, {
      bookId: "book-live",
      originId: "origin-live",
    })
    const before = {
      books: count("lorebooks"),
      versions: count("lorebook_versions"),
    }

    const error = await capture(importBook(payload, "restore"))

    expect(error).toMatchObject({ code: "IMPORT_ACTION_MISMATCH" })
    expect(count("lorebooks")).toBe(before.books)
    expect(count("lorebook_versions")).toBe(before.versions)
  })

  it("rejects a match that changed after the preview with IMPORT_STALE_MATCH", async () => {
    const payload = buildCCv3ImportPayload({
      originId: "origin-live",
      content: "Original content.",
    })
    await seedBookFromPayload(payload, {
      bookId: "book-live",
      originId: "origin-live",
    })
    const previewResult = await preview(payload)
    expect(previewResult.suggestedAction).toBe("reuse")

    client
      .prepare("UPDATE lorebooks SET deleted_at = ? WHERE id = ?")
      .run(Math.floor(now.getTime() / 1000), "book-live")

    const error = await capture(importBook(payload, "reuse"))

    expect(error).toMatchObject({ code: "IMPORT_STALE_MATCH" })
  })

  it("rejects an invalid payload with INVALID_CARD_JSON", async () => {
    const error = await capture(importBook("{not json", "new-book"))

    expect(error).toMatchObject({ code: "INVALID_CARD_JSON" })
  })
})
