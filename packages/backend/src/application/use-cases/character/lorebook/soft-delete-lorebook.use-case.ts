import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

export interface SoftDeleteLorebookDeps {
  lorebookRepository: LorebookRepository
}

export class SoftDeleteLorebookUseCase {
  constructor(private readonly deps: SoftDeleteLorebookDeps) {}

  async execute(id: string): Promise<void> {
    const found = await this.deps.lorebookRepository.findById(id)
    if (!found || found.book.deletedAt !== null) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        `Lorebook with id '${id}' not found.`,
        404,
      )
    }

    await this.deps.lorebookRepository.softDelete(id)
  }
}
