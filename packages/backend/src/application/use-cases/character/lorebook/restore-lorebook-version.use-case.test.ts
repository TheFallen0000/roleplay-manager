import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { eq } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { LorebookEntry } from "../../../../domain/entities/lorebook-entry.entity"
import { DrizzleLorebookRepository } from "../../../../infrastructure/adapters/secondary/drizzle/repositories/drizzle-lorebook.repository"
import {
  lorebooks,
  lorebookEntries,
  lorebookVersions,
} from "../../../../infrastructure/adapters/secondary/drizzle/schema"
import { buildDatabase, runMigrations } from "../../../../infrastructure/config/database"
import {
  buildLorebookEntity,
  buildLorebookEntryEntity,
  buildLorebookVersionEntity,
  LOREBOOK_FIXTURE_NOW,
} from "../../../../test-utils/lorebook-fixtures"

import {
  serializeLorebookEntries,
  toLorebookCanonicalContent,
} from "./lorebook.mapper"
import { RestoreLorebookVersionUseCase } from "./restore-lorebook-version.use-case"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "./source-key"

const root = mkdtempSync(join(tmpdir(), "rm-restore-lorebook-version-"))
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
}

interface VersionSeed {
  id: string
  entries: LorebookEntry[]
}

const sourceKeyFor = (bookId: string, entries: LorebookEntry[]): string => {
  const book = buildLorebookEntity({ id: bookId })
  return computeLorebookSourceKey(
    canonicalizeLorebookContent(toLorebookCanonicalContent(book, entries)),
  )
}

const seedBook = async (options: {
  bookId: string
  versions: VersionSeed[]
  currentVersionId: string
  deletedAt?: Date | null
}) => {
  const repository = new DrizzleLorebookRepository(db)
  const book = buildLorebookEntity({
    id: options.bookId,
    deletedAt: options.deletedAt ?? null,
  })
  const [first, ...rest] = options.versions
  const firstVersion = buildLorebookVersionEntity({
    id: first.id,
    lorebookId: options.bookId,
    versionNumber: 1,
    entriesJson: serializeLorebookEntries(first.entries),
    sourceKey: sourceKeyFor(options.bookId, first.entries),
  })
  await repository.createContainerWithVersion(
    book,
    first.entries,
    firstVersion,
  )

  let versionNumber = 1
  for (const version of rest) {
    versionNumber += 1
    const entity = buildLorebookVersionEntity({
      id: version.id,
      lorebookId: options.bookId,
      versionNumber,
      entriesJson: serializeLorebookEntries(version.entries),
      sourceKey: sourceKeyFor(options.bookId, version.entries),
    })
    await db.insert(lorebookVersions).values({
      id: entity.id,
      lorebookId: entity.lorebookId,
      versionNumber: entity.versionNumber,
      name: entity.name,
      description: entity.description,
      scanDepth: entity.scanDepth,
      tokenBudget: entity.tokenBudget,
      recursiveScanning: 0,
      entriesJson: entity.entriesJson,
      sourceKey: entity.sourceKey,
      createdAt: entity.createdAt,
    })
  }

  await db
    .update(lorebooks)
    .set({ currentVersionId: options.currentVersionId })
    .where(eq(lorebooks.id, options.bookId))

  const current = options.versions.find(
    (version) => version.id === options.currentVersionId,
  )
  if (current) {
    await db
      .delete(lorebookEntries)
      .where(eq(lorebookEntries.lorebookId, options.bookId))
    for (const entry of current.entries) {
      await repository.createEntry(entry)
    }
  }

  return repository
}

const versionsOf = (bookId: string) =>
  client
    .prepare(
      "SELECT id, version_number, source_key, entries_json FROM lorebook_versions WHERE lorebook_id = ? ORDER BY version_number",
    )
    .all(bookId)

const currentVersionIdOf = (bookId: string): string | null => {
  const row = client
    .prepare("SELECT current_version_id FROM lorebooks WHERE id = ?")
    .get(bookId) as { current_version_id: string | null } | undefined
  return row?.current_version_id ?? null
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

describe("RestoreLorebookVersionUseCase", () => {
  it("restores an old version as a new version and updates the live head", async () => {
    const repository = await seedBook({
      bookId: "book-1",
      versions: [
        {
          id: "version-1",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-v1",
              lorebookId: "book-1",
              content: "Version one content.",
            }),
          ],
        },
        {
          id: "version-2",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-v2",
              lorebookId: "book-1",
              content: "Version two content.",
            }),
          ],
        },
      ],
      currentVersionId: "version-2",
    })
    const before = versionsOf("book-1")
    const useCase = new RestoreLorebookVersionUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({
      lorebookId: "book-1",
      versionId: "version-1",
    })

    expect(result.createdNewVersion).toBe(true)
    const versions = versionsOf("book-1")
    expect(versions).toHaveLength(3)
    expect(versions[2].version_number).toBe(3)
    expect(currentVersionIdOf("book-1")).toBe(versions[2].id)
    expect(versions[0]).toEqual(before[0])

    const found = await repository.findById("book-1")
    expect(found?.entries.map((entry) => entry.content)).toEqual([
      "Version one content.",
    ])
  })

  it("forces a new version when the restored content matches the current source key", async () => {
    const sharedEntry = buildLorebookEntryEntity({
      id: "entry-shared",
      lorebookId: "book-1",
      content: "Shared content.",
    })
    const repository = await seedBook({
      bookId: "book-1",
      versions: [
        { id: "version-1", entries: [sharedEntry] },
        {
          id: "version-2",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-shared",
              lorebookId: "book-1",
              content: "Shared content.",
            }),
          ],
        },
      ],
      currentVersionId: "version-2",
    })
    const before = versionsOf("book-1")
    const useCase = new RestoreLorebookVersionUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({
      lorebookId: "book-1",
      versionId: "version-1",
    })

    expect(result.createdNewVersion).toBe(true)
    const versions = versionsOf("book-1")
    expect(versions).toHaveLength(3)
    expect(versions[2].version_number).toBe(3)
    expect(versions[2].source_key).toBe(before[1].source_key)
    expect(currentVersionIdOf("book-1")).toBe(versions[2].id)
    expect(versions[0]).toEqual(before[0])
  })

  it("returns createdNewVersion false when the selected version is current", async () => {
    const repository = await seedBook({
      bookId: "book-1",
      versions: [
        {
          id: "version-1",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-v1",
              lorebookId: "book-1",
              content: "Version one content.",
            }),
          ],
        },
        {
          id: "version-2",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-v2",
              lorebookId: "book-1",
              content: "Version two content.",
            }),
          ],
        },
      ],
      currentVersionId: "version-2",
    })
    const before = versionsOf("book-1")
    const useCase = new RestoreLorebookVersionUseCase({
      lorebookRepository: repository,
    } as never)

    const result = await useCase.execute({
      lorebookId: "book-1",
      versionId: "version-2",
    })

    expect(result.createdNewVersion).toBe(false)
    expect(versionsOf("book-1")).toEqual(before)
    expect(currentVersionIdOf("book-1")).toBe("version-2")
  })

  it("rejects a version that belongs to another book", async () => {
    const repository = await seedBook({
      bookId: "book-1",
      versions: [
        {
          id: "version-1",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-v1",
              lorebookId: "book-1",
              content: "Version one content.",
            }),
          ],
        },
      ],
      currentVersionId: "version-1",
    })
    await seedBook({
      bookId: "book-2",
      versions: [
        {
          id: "version-other",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-other",
              lorebookId: "book-2",
              content: "Other book content.",
            }),
          ],
        },
      ],
      currentVersionId: "version-other",
    })
    const useCase = new RestoreLorebookVersionUseCase({
      lorebookRepository: repository,
    } as never)

    const error = await capture(
      useCase.execute({
        lorebookId: "book-1",
        versionId: "version-other",
      }),
    )

    expect(error).toMatchObject({ code: "LOREBOOK_VERSION_NOT_FOUND" })
  })

  it("rejects restoring a deleted book", async () => {
    const repository = await seedBook({
      bookId: "book-1",
      versions: [
        {
          id: "version-1",
          entries: [
            buildLorebookEntryEntity({
              id: "entry-v1",
              lorebookId: "book-1",
              content: "Version one content.",
            }),
          ],
        },
      ],
      currentVersionId: "version-1",
      deletedAt: now,
    })
    const useCase = new RestoreLorebookVersionUseCase({
      lorebookRepository: repository,
    } as never)

    const error = await capture(
      useCase.execute({ lorebookId: "book-1", versionId: "version-1" }),
    )

    expect(error).toMatchObject({ code: "LOREBOOK_NOT_FOUND" })
  })
})
