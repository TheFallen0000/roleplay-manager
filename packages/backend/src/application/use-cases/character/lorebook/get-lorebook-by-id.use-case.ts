import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { toLorebookDTO } from "./lorebook.mapper"

export interface GetLorebookByIdDeps {
  lorebookRepository: LorebookRepository
}

export class GetLorebookByIdUseCase {
  constructor(private readonly deps: GetLorebookByIdDeps) {}

  async execute(input: { id: string }): Promise<LorebookDTO> {
    const found = await this.deps.lorebookRepository.findById(input.id)
    if (!found || found.book.deletedAt !== null) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        `Lorebook with id '${input.id}' not found.`,
        404,
      )
    }

    const currentVersion = found.book.currentVersionId
      ? await this.deps.lorebookRepository.findVersionById(
          found.book.currentVersionId,
        )
      : null

    return toLorebookDTO(
      found.book,
      found.entries,
      currentVersion?.versionNumber ?? null,
    )
  }
}
