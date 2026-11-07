import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { toLorebookDTO } from "./lorebook.mapper"

export interface GetLorebookDeps {
  lorebookRepository: LorebookRepository
}

export class GetLorebookUseCase {
  constructor(private readonly deps: GetLorebookDeps) {}

  async execute(input: { characterId: string }): Promise<LorebookDTO> {
    const found = await this.deps.lorebookRepository.findByCharacterId(
      input.characterId,
    )
    if (!found) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The character does not have a lorebook.",
        404,
      )
    }

    return toLorebookDTO(found.book, found.entries)
  }
}
