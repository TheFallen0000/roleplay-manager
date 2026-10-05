import type {
  PlayerCharacterDTO,
  UpdatePlayerCharacterInput,
} from "@workspace/shared/types/player-character"

import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { PlayerCharacterNotFoundError } from "../../../domain/errors"
import { toPlayerCharacterDTO } from "./player-character.mapper"

export class UpdatePlayerCharacterUseCase {
  constructor(
    private readonly playerCharacterRepository: PlayerCharacterRepository,
  ) {}

  async execute(
    id: string,
    input: UpdatePlayerCharacterInput,
  ): Promise<PlayerCharacterDTO> {
    const existing = await this.playerCharacterRepository.findById(id)
    if (!existing) {
      throw new PlayerCharacterNotFoundError(id)
    }

    const updated = existing.withChanges({
      name: input.name,
      description: input.description,
    })

    await this.playerCharacterRepository.update(updated)

    return toPlayerCharacterDTO(updated)
  }
}
