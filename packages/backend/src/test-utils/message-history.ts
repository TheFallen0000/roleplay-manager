import type { Message } from "../domain/entities/message.entity"
import type { MessageHistoryRepository } from "../domain/ports/message.repository"

type MessageSource = (
  conversationId: string,
) => Message[] | Promise<Message[]>

/**
 * Unit tests keep using their existing in-memory message lists; the batch
 * methods delegate to the same source so the use case sees the same data.
 */
export const buildMessageHistoryRepository = (
  getMessages: MessageSource = () => [],
  findPositionById: (id: string) => Promise<number | null> = async () => null,
): MessageHistoryRepository => ({
  findRecentByConversationId: async (conversationId, limit) => {
    if (limit <= 0) return []
    return (await getMessages(conversationId)).slice(-limit)
  },
  findAfterPosition: async (conversationId, position) =>
    (await getMessages(conversationId))
      .filter((message) => message.position > position)
      .sort((a, b) => a.position - b.position),
  // Positions are only needed to decide whether a summary is due; tests that
  // care about that boundary can override this method.
  findPositionById,
  findMaxPosition: async (conversationId) => {
    const messages = await getMessages(conversationId)
    return messages.length > 0
      ? Math.max(...messages.map((message) => message.position))
      : -1
  },
  countByConversationId: async (conversationId) =>
    (await getMessages(conversationId)).length,
  findUserMessageTimes: async (conversationId) =>
    (await getMessages(conversationId))
      .filter((message) => message.role === "user")
      .map((message) => message.createdAt),
  findStatsByConversationIds: async (conversationIds) =>
    Promise.all(
      conversationIds.map(async (conversationId) => {
        const messages = await getMessages(conversationId)
        return {
          conversationId,
          messageCount: messages.length,
          lastMessageAt: messages.at(-1)?.createdAt ?? null,
        }
      }),
    ),
})
