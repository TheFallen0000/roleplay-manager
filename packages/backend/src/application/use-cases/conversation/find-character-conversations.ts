import type { Conversation } from "../../../domain/entities/conversation.entity"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"

/** Conversations that belong to a character, most recently updated first. */
export async function findCharacterConversations(
  conversationRepository: ConversationRepository,
  characterRepository: CharacterRepository,
  characterId: string,
): Promise<Conversation[]> {
  const all = await conversationRepository.list()
  const matches: Conversation[] = []

  for (const conversation of all) {
    const version = await characterRepository.findVersionById(
      conversation.versionId,
    )
    if (version?.characterId === characterId) {
      matches.push(conversation)
    }
  }

  matches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  return matches
}
