import type {
  CharacterVersionDTO,
} from "@workspace/shared/types/character"
import type { LorebookVersionSummary } from "@workspace/shared/types/lorebook"

import type { CharacterVersion } from "../../../../domain/entities/character-version.entity"
import type { LorebookVersion } from "../../../../domain/entities/lorebook-version.entity"
import type { Lorebook } from "../../../../domain/entities/lorebook.entity"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"
import { toCharacterVersionDTO } from "../character-version.mapper"

const toSummary = (
  version: LorebookVersion,
  book: Lorebook,
): LorebookVersionSummary => ({
  lorebookId: book.id,
  versionId: version.id,
  versionNumber: version.versionNumber,
  name: version.name,
  entryCount: countEntries(version.entriesJson),
  sourceKey: version.sourceKey,
  originId: book.originId,
  status:
    book.deletedAt !== null
      ? "deleted"
      : version.id !== book.currentVersionId
        ? "outdated"
        : "current",
})

/**
 * Builds the summary of the immutable lorebook version linked by a character
 * version. A missing version/container returns `null` so the character detail
 * can still be rendered from partial data.
 */
export async function buildLorebookVersionSummary(
  repository: LorebookRepository,
  lorebookVersionId: string | null | undefined,
): Promise<LorebookVersionSummary | null> {
  if (!lorebookVersionId) return null

  const version = await repository.findVersionById(lorebookVersionId)
  if (!version) return null

  const container = await repository.findById(version.lorebookId)
  if (!container) return null

  return toSummary(version, container.book)
}

/**
 * Resolves every linked lorebook summary with two batched queries instead of
 * two per character version. Missing versions/books degrade to `null`.
 */
export async function buildLorebookVersionSummaries(
  repository: LorebookRepository,
  lorebookVersionIds: Array<string | null | undefined>,
): Promise<Map<string, LorebookVersionSummary | null>> {
  const versionIds = [
    ...new Set(
      lorebookVersionIds.filter((id): id is string => Boolean(id)),
    ),
  ]
  const summaries = new Map<string, LorebookVersionSummary | null>()
  if (versionIds.length === 0) return summaries

  // Partial repository doubles may only expose the per-id lookups.
  if (
    typeof repository.findVersionsByIds !== "function" ||
    typeof repository.findByIds !== "function"
  ) {
    for (const versionId of versionIds) {
      summaries.set(
        versionId,
        await buildLorebookVersionSummary(repository, versionId),
      )
    }
    return summaries
  }

  const versions = await repository.findVersionsByIds(versionIds)
  const versionsById = new Map(versions.map((version) => [version.id, version]))
  const bookIds = [...new Set(versions.map((version) => version.lorebookId))]
  const books = bookIds.length > 0 ? await repository.findByIds(bookIds) : []
  const booksById = new Map(books.map((book) => [book.id, book]))

  for (const versionId of versionIds) {
    const version = versionsById.get(versionId)
    if (!version) {
      summaries.set(versionId, null)
      continue
    }

    const book = booksById.get(version.lorebookId)
    summaries.set(versionId, book ? toSummary(version, book) : null)
  }

  return summaries
}

/**
 * Best-effort DTO mapping for a list of character versions: one batch resolves
 * every linked lorebook summary, and failures degrade to `null`.
 */
export async function toCharacterVersionDTOsWithLorebookSummaries(
  versions: CharacterVersion[],
  repository?: LorebookRepository,
): Promise<CharacterVersionDTO[]> {
  if (!repository) {
    return versions.map((version) => toCharacterVersionDTO(version))
  }

  try {
    const summaries = await buildLorebookVersionSummaries(
      repository,
      versions.map((version) => version.lorebookVersionId),
    )

    return versions.map((version) =>
      toCharacterVersionDTO(
        version,
        version.lorebookVersionId
          ? summaries.get(version.lorebookVersionId) ?? null
          : null,
      ),
    )
  } catch {
    return versions.map((version) => toCharacterVersionDTO(version, null))
  }
}

/**
 * Best-effort DTO mapping for a character version. Without a repository the
 * summary is omitted entirely; with one, failures degrade to `null` so a
 * minimal mock or incomplete row never breaks the character detail.
 */
export async function toCharacterVersionDTOWithLorebookSummary(
  version: CharacterVersion,
  repository?: LorebookRepository,
): Promise<CharacterVersionDTO> {
  if (!repository) return toCharacterVersionDTO(version)

  try {
    const summary = await buildLorebookVersionSummary(
      repository,
      version.lorebookVersionId,
    )
    return toCharacterVersionDTO(version, summary)
  } catch {
    return toCharacterVersionDTO(version, null)
  }
}

function countEntries(entriesJson: string): number {
  try {
    const parsed: unknown = JSON.parse(entriesJson)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}
