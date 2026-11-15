import type { LorebookVersionDTO } from "@workspace/shared/types/lorebook"

import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { toLorebookVersionDTO } from "./lorebook.mapper"

export interface ListLorebookVersionsDeps {
  lorebookRepository: LorebookRepository
}

export class ListLorebookVersionsUseCase {
  constructor(private readonly deps: ListLorebookVersionsDeps) {}

  async execute(input: { lorebookId: string }): Promise<LorebookVersionDTO[]> {
    const versions = await this.deps.lorebookRepository.findVersions(
      input.lorebookId,
    )

    return versions.map((version) => toLorebookVersionDTO(version))
  }
}
