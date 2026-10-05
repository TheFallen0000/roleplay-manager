import { v7 as randomUUIDv7 } from "uuid"

import type {
  CreatePlayerCharacterInput,
  PlayerCharacterDTO,
} from "@workspace/shared/types/player-character"

import { PlayerCharacter } from "../../../domain/entities/player-character.entity"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { toPlayerCharacterDTO } from "./player-character.mapper"

export class CreatePlayerCharacterUseCase {
  constructor(
    private readonly playerCharacterRepository: PlayerCharacterRepository,
  ) {}

  async execute(
    input: CreatePlayerCharacterInput,
  ): Promise<PlayerCharacterDTO> {
    const now = new Date()
    const playerCharacter = PlayerCharacter.create({
      id: randomUUIDv7(),
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    })

    await this.playerCharacterRepository.create(playerCharacter)

    return toPlayerCharacterDTO(playerCharacter)
  }
}
