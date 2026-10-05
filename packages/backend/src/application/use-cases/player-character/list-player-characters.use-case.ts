import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"

import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { toPlayerCharacterDTO } from "./player-character.mapper"

export class ListPlayerCharactersUseCase {
  constructor(
    private readonly playerCharacterRepository: PlayerCharacterRepository,
  ) {}

  async execute(): Promise<PlayerCharacterDTO[]> {
    const playerCharacters = await this.playerCharacterRepository.list()
    return playerCharacters.map(toPlayerCharacterDTO)
  }
}
