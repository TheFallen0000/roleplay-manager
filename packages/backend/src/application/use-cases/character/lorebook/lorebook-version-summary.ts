import type {
  CharacterVersionDTO,
} from "@workspace/shared/types/character"
import type { LorebookVersionSummary } from "@workspace/shared/types/lorebook"

import type { CharacterVersion } from "../../../../domain/entities/character-version.entity"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"
import { toCharacterVersionDTO } from "../character-version.mapper"

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

  const book = container.book
  return {
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
