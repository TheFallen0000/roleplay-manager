import type { CharacterDetail } from "@workspace/shared/types/character"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import { CharacterNotFoundError } from "../../../domain/errors"
import { toCharacterVersionDTO } from "./character-version.mapper"

export class GetCharacterUseCase {
  constructor(private readonly characterRepository: CharacterRepository) {}

  async execute(id: string): Promise<CharacterDetail> {
    const result = await this.characterRepository.findById(id)

    if (!result) {
      throw new CharacterNotFoundError(id)
    }

    const allVersions = await this.characterRepository.findVersionsByCharacterId(id)

    return {
      id: result.character.id,
      name: result.character.name,
      createdAt: result.character.createdAt.toISOString(),
      updatedAt: result.character.updatedAt.toISOString(),
      currentVersion: toCharacterVersionDTO(result.currentVersion),
      versions: allVersions.map(toCharacterVersionDTO),
    }
  }
}
