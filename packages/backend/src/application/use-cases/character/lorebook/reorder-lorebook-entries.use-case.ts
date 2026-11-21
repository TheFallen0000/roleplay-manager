import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

export interface ReorderLorebookEntriesDeps {
  lorebookRepository: LorebookRepository
}

export interface ReorderLorebookEntriesInput {
  characterId: string
  entryIds: string[]
}

export class ReorderLorebookEntriesUseCase {
  constructor(private readonly deps: ReorderLorebookEntriesDeps) {}

  async execute(input: ReorderLorebookEntriesInput): Promise<void> {
    const existing = await this.deps.lorebookRepository.findByCharacterId(
      input.characterId,
    )
    if (!existing) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The character does not have a lorebook.",
        404,
      )
    }

    const knownIds = new Set(existing.entries.map((entry) => entry.id))
    const seen = new Set<string>()
    for (const entryId of input.entryIds) {
      if (seen.has(entryId)) {
        throw new DomainError(
          "INVALID_LOREBOOK_ORDER",
          "The entry order contains duplicates.",
          400,
        )
      }
      seen.add(entryId)
      if (!knownIds.has(entryId)) {
        throw new DomainError(
          "INVALID_LOREBOOK_ORDER",
          "The entry order contains an entry that does not belong to this lorebook.",
          400,
        )
      }
    }

    await this.deps.lorebookRepository.reorderEntries(input.entryIds)
  }
}
