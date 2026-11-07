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

    await this.deps.lorebookRepository.reorderEntries(input.entryIds)
  }
}
