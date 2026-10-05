import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { PlayerCharacterNotFoundError } from "../../../domain/errors"

export class DeletePlayerCharacterUseCase {
  constructor(
    private readonly playerCharacterRepository: PlayerCharacterRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.playerCharacterRepository.findById(id)
    if (!existing) {
      throw new PlayerCharacterNotFoundError(id)
    }

    await this.playerCharacterRepository.delete(id)
  }
}
