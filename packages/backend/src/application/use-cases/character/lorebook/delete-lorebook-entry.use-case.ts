import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

export interface DeleteLorebookEntryDeps {
  lorebookRepository: LorebookRepository
}

export interface DeleteLorebookEntryInput {
  characterId: string
  entryId: string
}

export class DeleteLorebookEntryUseCase {
  constructor(private readonly deps: DeleteLorebookEntryDeps) {}

  async execute(input: DeleteLorebookEntryInput): Promise<void> {
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
    if (!existing.entries.some((entry) => entry.id === input.entryId)) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The lorebook entry does not exist.",
        404,
      )
    }

    await this.deps.lorebookRepository.deleteEntry(input.entryId)
  }
}
