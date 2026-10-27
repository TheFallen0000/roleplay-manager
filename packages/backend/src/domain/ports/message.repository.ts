import type { Message } from "../entities/message.entity"

export interface ConversationMessageStats {
  conversationId: string
  messageCount: number
  lastMessageAt: Date | null
}

export interface MessagePage {
  messages: Message[]
  hasMore: boolean
}

export interface MessagePageQuery {
  /** Oldest message position of the next page; omit for the latest page. */
  before?: number
  limit: number
}

export interface MessageHistoryRepository {
  findPageByConversationId(
    conversationId: string,
    query: MessagePageQuery,
  ): Promise<MessagePage>

  findRecentByConversationId(
    conversationId: string,
    limit: number,
  ): Promise<Message[]>

  findAfterPosition(
    conversationId: string,
    position: number,
  ): Promise<Message[]>

  findPositionById(id: string): Promise<number | null>

  findMaxPosition(conversationId: string): Promise<number>

  countByConversationId(conversationId: string): Promise<number>

  findUserMessageTimes(conversationId: string): Promise<Date[]>

  findStatsByConversationIds(
    conversationIds: string[],
  ): Promise<ConversationMessageStats[]>
}

export interface MessageRepository {
  create(message: Message): Promise<Message>

  findByConversationId(conversationId: string): Promise<Message[]>

  findById(id: string): Promise<Message | null>

  findLastByConversationId(conversationId: string): Promise<Message | null>

  update(message: Message): Promise<Message>

  deleteById(id: string): Promise<void>

  deleteAfterPosition(conversationId: string, position: number): Promise<void>

  clearAlternatives(conversationId: string): Promise<void>
}
