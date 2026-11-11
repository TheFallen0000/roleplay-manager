import type { LorebookVersionDTO } from "@workspace/shared/types/lorebook"

import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { toLorebookVersionDTO } from "./lorebook.mapper"

export interface GetLorebookVersionDeps {
  lorebookRepository: LorebookRepository
}

export class GetLorebookVersionUseCase {
  constructor(private readonly deps: GetLorebookVersionDeps) {}

  async execute(input: {
    lorebookId: string
    versionId: string
  }): Promise<LorebookVersionDTO> {
    const version = await this.deps.lorebookRepository.findVersionById(
      input.versionId,
    )
    if (!version || version.lorebookId !== input.lorebookId) {
      throw new DomainError(
        "LOREBOOK_VERSION_NOT_FOUND",
        `Lorebook version with id '${input.versionId}' not found.`,
        404,
      )
    }

    return toLorebookVersionDTO(version)
  }
}
