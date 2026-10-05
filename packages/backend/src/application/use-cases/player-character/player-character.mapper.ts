import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"

import type { PlayerCharacter } from "../../../domain/entities/player-character.entity"

export function toPlayerCharacterDTO(
  playerCharacter: PlayerCharacter,
): PlayerCharacterDTO {
  return {
    id: playerCharacter.id,
    name: playerCharacter.name,
    description: playerCharacter.description,
    createdAt: playerCharacter.createdAt.toISOString(),
    updatedAt: playerCharacter.updatedAt.toISOString(),
  }
}
