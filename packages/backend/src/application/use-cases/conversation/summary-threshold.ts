import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"

/**
 * Number of messages added since the last summary, without loading the whole
 * history. `position` is contiguous per conversation, so the count after the
 * summary boundary is enough.
 */
export const countMessagesSinceSummary = async (
  conversationId: string,
  lastSummaryMessageId: string | null,
  messageRepository: MessageHistoryRepository,
): Promise<number> => {
  const total = await messageRepository.countByConversationId(conversationId)
  if (!lastSummaryMessageId) return total

  const position = await messageRepository.findPositionById(lastSummaryMessageId)
  if (position === null) return total

  return Math.max(0, total - position - 1)
}
