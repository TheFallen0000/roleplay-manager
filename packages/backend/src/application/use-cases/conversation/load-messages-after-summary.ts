import type { MessageHistoryRepository, MessageRepository } from "../../../domain/ports/message.repository"
import type { Summary } from "../../../domain/entities/summary.entity"
import type { Message } from "../../../domain/entities/message.entity"

/**
 * Messages that still need to be sent verbatim: everything after the previous
 * summary boundary. Without a summary the whole history is a candidate.
 */
export const loadMessagesAfterSummary = async (params: {
  conversationId: string
  summary: Summary | null
  messageHistoryRepository: MessageHistoryRepository
  messageRepository: MessageRepository
}): Promise<Message[]> => {
  const { conversationId, summary, messageHistoryRepository, messageRepository } =
    params
  const position = summary
    ? await messageHistoryRepository.findPositionById(summary.lastMessageId)
    : null

  return position !== null
    ? await messageHistoryRepository.findAfterPosition(conversationId, position)
    : await messageRepository.findByConversationId(conversationId)
}
