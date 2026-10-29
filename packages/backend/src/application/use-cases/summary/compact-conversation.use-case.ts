import type { SummaryDTO } from "@workspace/shared/types/summary"
import type { Locale } from "@workspace/shared/i18n"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { ChatEngine } from "../../services/chat-engine.service"

export type CompactConversationOutput =
  | { summary: SummaryDTO; error?: never }
  | { summary?: never; error: { code: string; message: string } }

/**
 * The "summary now" button: runs the same compaction as a normal send, even
 * when the context is below the threshold, so the result fits the configured
 * budget and the next send does not compact again immediately.
 */
export class CompactConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly chatEngine: ChatEngine,
  ) {}

  async execute(
    conversationId: string,
    locale?: Locale,
  ): Promise<CompactConversationOutput> {
    const conversation =
      await this.conversationRepository.findById(conversationId)
    if (!conversation) {
      return {
        error: {
          code: "CONVERSATION_NOT_FOUND",
          message: "Conversation not found",
        },
      }
    }

    const result = await this.chatEngine.compactNow(conversation, locale)
    if (!result.ok) {
      return { error: result.error }
    }
    return { summary: result.summary }
  }
}
