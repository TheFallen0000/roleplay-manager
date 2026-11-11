import type { CharacterDetail } from "@workspace/shared/types/character"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"
import { CharacterNotFoundError } from "../../../domain/errors"
import { toCharacterVersionDTOWithLorebookSummary } from "./lorebook/lorebook-version-summary"

export class GetCharacterUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly lorebookRepository?: LorebookRepository,
  ) {}

  async execute(id: string): Promise<CharacterDetail> {
    const result = await this.characterRepository.findById(id)

    if (!result) {
      throw new CharacterNotFoundError(id)
    }

    const allVersions = await this.characterRepository.findVersionsByCharacterId(id)

    const currentVersion = await toCharacterVersionDTOWithLorebookSummary(
      result.currentVersion,
      this.lorebookRepository,
    )
    const versions = await Promise.all(
      allVersions.map((version) =>
        toCharacterVersionDTOWithLorebookSummary(
          version,
          this.lorebookRepository,
        ),
      ),
    )

    return {
      id: result.character.id,
      name: result.character.name,
      createdAt: result.character.createdAt.toISOString(),
      updatedAt: result.character.updatedAt.toISOString(),
      currentVersion,
      versions,
    }
  }
}
