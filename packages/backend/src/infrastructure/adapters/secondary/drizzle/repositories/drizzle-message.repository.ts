import { and, count, desc, eq, gt, inArray, lt, max } from "drizzle-orm"

import { Message } from "../../../../../domain/entities/message.entity"
import type {
  ConversationMessageStats,
  MessageHistoryRepository,
  MessagePage,
  MessagePageQuery,
  MessageRepository,
} from "../../../../../domain/ports/message.repository"
import type { Database } from "../../../../config/database"
import { messages } from "../schema"

type MessageRow = typeof messages.$inferSelect

const toMessage = (row: MessageRow): Message =>
  Message.fromPersistence({
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "user" | "assistant",
    content: row.content,
    position: row.position,
    alternatives: row.alternatives ?? [],
    alternativesCursor: row.alternativesCursor,
    createdAt: new Date(row.createdAt),
    editedAt: row.editedAt ? new Date(row.editedAt) : null,
  })

export class DrizzleMessageRepository
  implements MessageRepository, MessageHistoryRepository
{
  constructor(private readonly db: Database) {}

  async create(message: Message): Promise<Message> {
    await this.db.insert(messages).values({
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.rawContent,
      position: message.position,
      alternatives: message.alternatives,
      alternativesCursor: message.alternativesCursor,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
    })

    return message
  }

  async findById(id: string): Promise<Message | null> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toMessage(rows[0])
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.position)

    return rows.map(toMessage)
  }

  async findPageByConversationId(
    conversationId: string,
    { before, limit }: MessagePageQuery,
  ): Promise<MessagePage> {
    const safeLimit = Math.max(1, Math.min(limit, 200))
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        before === undefined
          ? eq(messages.conversationId, conversationId)
          : and(
              eq(messages.conversationId, conversationId),
              lt(messages.position, before),
            ),
      )
      .orderBy(desc(messages.position))
      .limit(safeLimit + 1)

    const hasMore = rows.length > safeLimit
    const page = hasMore ? rows.slice(0, safeLimit) : rows

    return { messages: page.reverse().map(toMessage), hasMore }
  }

  async findRecentByConversationId(
    conversationId: string,
    limit: number,
  ): Promise<Message[]> {
    if (limit <= 0) return []

    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.position))
      .limit(limit)

    return rows.reverse().map(toMessage)
  }

  async findAfterPosition(
    conversationId: string,
    position: number,
  ): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          gt(messages.position, position),
        ),
      )
      .orderBy(messages.position)

    return rows.map(toMessage)
  }

  async findLastByConversationId(conversationId: string): Promise<Message | null> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.position))
      .limit(1)

    if (rows.length === 0) return null
    return toMessage(rows[0])
  }

  async findPositionById(id: string): Promise<number | null> {
    const rows = await this.db
      .select({ position: messages.position })
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)

    return rows[0]?.position ?? null
  }

  async findMaxPosition(conversationId: string): Promise<number> {
    const rows = await this.db
      .select({ maxPosition: max(messages.position) })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))

    return rows[0]?.maxPosition ?? -1
  }

  async countByConversationId(conversationId: string): Promise<number> {
    const rows = await this.db
      .select({ messageCount: count() })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))

    return Number(rows[0]?.messageCount ?? 0)
  }

  async findUserMessageTimes(conversationId: string): Promise<Date[]> {
    const rows = await this.db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.role, "user"),
        ),
      )
      .orderBy(messages.createdAt)

    return rows.map((row) => row.createdAt)
  }

  async findStatsByConversationIds(
    conversationIds: string[],
  ): Promise<ConversationMessageStats[]> {
    if (conversationIds.length === 0) return []

    const rows = await this.db
      .select({
        conversationId: messages.conversationId,
        messageCount: count(),
        lastMessageAt: max(messages.createdAt),
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .groupBy(messages.conversationId)

    return rows.map((row) => ({
      conversationId: row.conversationId,
      messageCount: Number(row.messageCount),
      lastMessageAt: row.lastMessageAt ?? null,
    }))
  }

  async update(message: Message): Promise<Message> {
    await this.db
      .update(messages)
      .set({
        content: message.rawContent,
        position: message.position,
        alternatives: message.alternatives,
        alternativesCursor: message.alternativesCursor,
        editedAt: message.editedAt,
      })
      .where(eq(messages.id, message.id))

    return message
  }

  async deleteById(id: string): Promise<void> {
    await this.db
      .delete(messages)
      .where(eq(messages.id, id))
  }

  async deleteAfterPosition(conversationId: string, position: number): Promise<void> {
    await this.db
      .delete(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          gt(messages.position, position),
        ),
      )
  }

  async clearAlternatives(conversationId: string): Promise<void> {
    await this.db
      .update(messages)
      .set({
        alternatives: [],
        alternativesCursor: 0,
      })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.role, "assistant"),
        ),
      )
  }
}
