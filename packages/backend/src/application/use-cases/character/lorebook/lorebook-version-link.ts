import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

/**
 * Resolves the `character_versions.lorebook_version_id` link. An explicit id is
 * validated when a repository is available; `null` removes the link and
 * `undefined` is treated as no link by callers that have already copied the
 * previous value.
 */
export async function resolveLorebookVersionId(
  repository: LorebookRepository | undefined,
  value: string | null | undefined,
): Promise<string | null> {
  if (typeof value !== "string") return value ?? null

  if (repository) {
    const version = await repository.findVersionById(value)
    if (!version) {
      throw new DomainError(
        "LOREBOOK_VERSION_NOT_FOUND",
        `Lorebook version with id '${value}' not found.`,
        404,
      )
    }
  }

  return value
}
