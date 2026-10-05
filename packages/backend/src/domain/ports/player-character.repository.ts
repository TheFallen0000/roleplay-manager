import type { PlayerCharacter } from "../entities/player-character.entity"

export interface PlayerCharacterRepository {
  findById(id: string): Promise<PlayerCharacter | null>

  list(): Promise<PlayerCharacter[]>

  create(playerCharacter: PlayerCharacter): Promise<PlayerCharacter>

  update(playerCharacter: PlayerCharacter): Promise<PlayerCharacter>

  delete(id: string): Promise<void>
}
