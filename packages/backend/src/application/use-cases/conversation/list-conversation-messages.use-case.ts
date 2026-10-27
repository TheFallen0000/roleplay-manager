import type { ConversationMessagePage } from "@workspace/shared/types/conversation"
import {
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE,
} from "@workspace/shared/types/conversation"
import type { MessageDTO } from "@workspace/shared/types/message"
import type { Message } from "../../../domain/entities/message.entity"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import { ConversationNotFoundError } from "../../../domain/errors"

export const toMessageDTO = (message: Message): MessageDTO => ({
  id: message.id,
  conversationId: message.conversationId,
  role: message.role,
  content: message.content,
  position: message.position,
  alternatives: message.alternatives,
  alternativesCursor: message.alternativesCursor,
  createdAt: message.createdAt.toISOString(),
  editedAt: message.editedAt?.toISOString() ?? null,
})

export interface ListConversationMessagesInput {
  before?: number
  limit?: number
}

export class ListConversationMessagesUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageHistoryRepository,
  ) {}

  async execute(
    conversationId: string,
    input: ListConversationMessagesInput = {},
  ): Promise<ConversationMessagePage> {
    const conversation = await this.conversationRepository.findById(conversationId)
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId)
    }

    const limit = Math.min(
      Math.max(input.limit ?? DEFAULT_MESSAGE_PAGE_SIZE, 1),
      MAX_MESSAGE_PAGE_SIZE,
    )
    const page = await this.messageRepository.findPageByConversationId(
      conversationId,
      { before: input.before, limit },
    )
    const nextCursor = page.hasMore
      ? page.messages[0]?.position ?? null
      : null

    return {
      messages: page.messages.map(toMessageDTO),
      hasMore: page.hasMore,
      nextCursor,
    }
  }
}
