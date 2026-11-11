import type { CharacterVersionDTO } from "@workspace/shared/types/character"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import { CharacterNotFoundError } from "../../../domain/errors"
import { toCharacterVersionDTO } from "./character-version.mapper"

export class ListCharacterVersionsUseCase {
  constructor(private readonly characterRepository: CharacterRepository) {}

  async execute(characterId: string): Promise<CharacterVersionDTO[]> {
    const existing = await this.characterRepository.findById(characterId)
    if (!existing) {
      throw new CharacterNotFoundError(characterId)
    }

    const versions = await this.characterRepository.findVersionsByCharacterId(characterId)

    return versions.map((version) => toCharacterVersionDTO(version))
  }
}
