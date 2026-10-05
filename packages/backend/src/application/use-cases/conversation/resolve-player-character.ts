import type { Conversation } from "../../../domain/entities/conversation.entity"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"

export interface PlayerCharacterPrompt {
  name: string
  description: string
}

export async function resolvePlayerCharacterPrompt(
  repository: PlayerCharacterRepository,
  conversation: Conversation,
): Promise<PlayerCharacterPrompt | undefined> {
  const playerCharacterId = conversation.playerCharacterId
  if (!playerCharacterId) return undefined

  const playerCharacter = await repository.findById(playerCharacterId)
  if (!playerCharacter) return undefined

  return {
    name: playerCharacter.name,
    description: playerCharacter.description,
  }
}
