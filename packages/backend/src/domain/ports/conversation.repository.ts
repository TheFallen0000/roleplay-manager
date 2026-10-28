import type { Conversation } from "../entities/conversation.entity"
import type { ConversationSettingsUpdate } from "@workspace/shared/types/conversation"

export interface ConversationRepository {
  create(conversation: Conversation): Promise<Conversation>

  findById(id: string): Promise<Conversation | null>

  list(limit?: number): Promise<Conversation[]>

  listByCharacterId(
    characterId: string,
    limit?: number,
  ): Promise<Conversation[]>

  listByCharacterIds(
    characterIds: string[],
    limit?: number,
  ): Promise<Conversation[]>

  existsByAssetId(assetId: string): Promise<boolean>

  update(conversation: Conversation): Promise<Conversation>

  updateSettings(
    id: string,
    settings: ConversationSettingsUpdate,
  ): Promise<Conversation>

  clearProviderInstanceId(providerInstanceId: string): Promise<void>
}
