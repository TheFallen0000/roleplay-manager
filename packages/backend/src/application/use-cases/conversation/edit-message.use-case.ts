import type { MessageDTO } from "@workspace/shared/types/message"

import { Message } from "../../../domain/entities/message.entity"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import {
  ConversationNotFoundError,
  MessageNotFoundError,
} from "../../../domain/errors"
import { normalizeUserContent } from "../../../lib/reply-format"

export interface EditMessageInput {
  conversationId: string
  messageId: string
  content: string
}

export class EditMessageUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  async execute(input: EditMessageInput): Promise<MessageDTO> {
    const conversation = await this.conversationRepository.findById(
      input.conversationId,
    )
    if (!conversation) {
      throw new ConversationNotFoundError(input.conversationId)
    }

    const message = await this.messageRepository.findById(input.messageId)
    if (!message) {
      throw new MessageNotFoundError(input.messageId)
    }

    const updated = message.withContent(normalizeUserContent(input.content))
    await this.messageRepository.update(updated)

    return toMessageDTO(updated)
  }
}

function toMessageDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    position: m.position,
    alternatives: m.alternatives,
    alternativesCursor: m.alternativesCursor,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
  }
}
