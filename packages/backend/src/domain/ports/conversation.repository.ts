import type { Conversation } from "../entities/conversation.entity"
import type { Message } from "../entities/message.entity"
import type { ConversationSettingsUpdate } from "@workspace/shared/types/conversation"

export interface ConversationWithMessages {
  conversation: Conversation
  messages: Message[]
}

export interface ConversationRepository {
  create(conversation: Conversation): Promise<Conversation>

  findById(id: string): Promise<Conversation | null>

  findByIdWithMessages(id: string): Promise<ConversationWithMessages | null>

  list(): Promise<Conversation[]>

  listByCharacterId(characterId: string): Promise<Conversation[]>

  update(conversation: Conversation): Promise<Conversation>

  updateSettings(
    id: string,
    settings: ConversationSettingsUpdate,
  ): Promise<Conversation>

  clearProviderInstanceId(providerInstanceId: string): Promise<void>
}
