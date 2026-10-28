import type { Conversation } from "../../../domain/entities/conversation.entity"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"

/** Conversations that belong to a character, most recently updated first. */
export function findCharacterConversations(
  conversationRepository: ConversationRepository,
  characterId: string,
): Promise<Conversation[]> {
  return conversationRepository.listByCharacterId(characterId)
}
