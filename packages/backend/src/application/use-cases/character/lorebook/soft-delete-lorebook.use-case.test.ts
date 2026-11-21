import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { eq } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { DrizzleLorebookRepository } from "../../../../infrastructure/adapters/secondary/drizzle/repositories/drizzle-lorebook.repository"
import {
  characterVersions,
  characters,
  lorebooks,
  lorebookVersions,
} from "../../../../infrastructure/adapters/secondary/drizzle/schema"
import { buildDatabase, runMigrations } from "../../../../infrastructure/config/database"
import {
  buildLorebookEntity,
  buildLorebookEntryEntity,
  buildLorebookVersionEntity,
  LOREBOOK_FIXTURE_NOW,
} from "../../../../test-utils/lorebook-fixtures"

import { SoftDeleteLorebookUseCase } from "./soft-delete-lorebook.use-case"

const root = mkdtempSync(join(tmpdir(), "rm-soft-delete-lorebook-"))
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

const seedLinkedBook = async () => {
  const repository = new DrizzleLorebookRepository(db)
  const book = buildLorebookEntity({ id: "book-1" })
  const entry = buildLorebookEntryEntity({
    id: "entry-1",
    lorebookId: "book-1",
  })
  const v1 = buildLorebookVersionEntity({
    id: "version-1",
    lorebookId: "book-1",
    entriesJson: JSON.stringify([
      { sourceId: "1", keys: ["dragon"], content: "Version one." },
    ]),
  })
  const v2 = buildLorebookVersionEntity({
    id: "version-2",
    lorebookId: "book-1",
    versionNumber: 2,
    sourceKey: "b".repeat(64),
    entriesJson: JSON.stringify([
      { sourceId: "1", keys: ["dragon"], content: "Version two." },
    ]),
  })

  await repository.createContainerWithVersion(book, [entry], v1)
  await db.insert(lorebookVersions).values({
    id: v2.id,
    lorebookId: v2.lorebookId,
    versionNumber: v2.versionNumber,
    name: v2.name,
    description: v2.description,
    scanDepth: v2.scanDepth,
    tokenBudget: v2.tokenBudget,
    recursiveScanning: 0,
    entriesJson: v2.entriesJson,
    sourceKey: v2.sourceKey,
    createdAt: v2.createdAt,
  })
  await db
    .update(lorebooks)
    .set({ currentVersionId: "version-2" })
    .where(eq(lorebooks.id, "book-1"))

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
    lorebookVersionId: "version-1",
  })

  return { repository, v1, v2 }
}

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

describe("SoftDeleteLorebookUseCase", () => {
  it("sets deleted_at without touching versions or character versions", async () => {
    const { repository } = await seedLinkedBook()
    const useCase = new SoftDeleteLorebookUseCase({
      lorebookRepository: repository,
    } as never)

    await useCase.execute("book-1")

    const bookRow = client
      .prepare("SELECT deleted_at FROM lorebooks WHERE id = ?")
      .get("book-1") as { deleted_at: number | null } | undefined
    expect(bookRow?.deleted_at).not.toBeNull()

    const versions = client
      .prepare(
        "SELECT id FROM lorebook_versions WHERE lorebook_id = ? ORDER BY version_number",
      )
      .all("book-1")
    expect(versions.map((row) => row.id)).toEqual(["version-1", "version-2"])

    const characterVersion = client
      .prepare(
        "SELECT lorebook_version_id FROM character_versions WHERE id = ?",
      )
      .get("cv-1") as { lorebook_version_id: string } | undefined
    expect(characterVersion?.lorebook_version_id).toBe("version-1")

    const summaries = await repository.listSummaries()
    expect(summaries.map((summary) => summary.book.id)).not.toContain("book-1")
  })

  it("returns LOREBOOK_NOT_FOUND on a second delete", async () => {
    const { repository } = await seedLinkedBook()
    const useCase = new SoftDeleteLorebookUseCase({
      lorebookRepository: repository,
    } as never)

    await useCase.execute("book-1")
    const firstDeletedAt = client
      .prepare("SELECT deleted_at FROM lorebooks WHERE id = ?")
      .get("book-1") as { deleted_at: number | null } | undefined

    const error = await capture(useCase.execute("book-1"))

    expect(error).toMatchObject({ code: "LOREBOOK_NOT_FOUND" })
    const secondDeletedAt = client
      .prepare("SELECT deleted_at FROM lorebooks WHERE id = ?")
      .get("book-1") as { deleted_at: number | null } | undefined
    expect(secondDeletedAt?.deleted_at).toBe(firstDeletedAt?.deleted_at)
  })
})
