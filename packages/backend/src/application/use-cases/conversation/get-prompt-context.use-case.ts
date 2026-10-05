import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { resolvePlayerCharacterPrompt } from "./resolve-player-character"
import type { PromptContextDTO, PromptContextMetadataDTO } from "@workspace/shared/types/context"
import { filterMemoriesForPrompt } from "../../../lib/memory-decay"
import {
  ConversationNotFoundError,
} from "../../../domain/errors"

export class GetPromptContextUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly messageRepository: MessageRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly promptContextBuilder: PromptContextBuilder,
    private readonly playerCharacterRepository: PlayerCharacterRepository,
  ) {}

  async execute(
    conversationId: string,
    pendingMessage?: string,
  ): Promise<PromptContextDTO> {
    const conv = await this.conversationRepository.findById(conversationId)
    if (!conv) {
      throw new ConversationNotFoundError(conversationId)
    }

    const characterVersion = await this.characterRepository.findVersionById(conv.versionId)
    const memories = await this.memoryRepository.findByConversationId(conversationId)
    const allMessages = await this.messageRepository.findByConversationId(conversationId)
    const summary = await this.summaryRepository.findLatestByConversationId(conversationId)

    const recentMessages = allMessages.slice(-conv.recentMessageCount)
    const promptMemories = filterMemoriesForPrompt(conv, memories, allMessages)

    const playerCharacter = await resolvePlayerCharacterPrompt(
      this.playerCharacterRepository,
      conv,
    )

    const context = await this.promptContextBuilder.build({
      characterVersion: characterVersion!,
      messages: recentMessages,
      recentMessageCount: conv.recentMessageCount,
      memories: promptMemories,
      summary: summary ?? undefined,
      playerCharacter,
      enableMemoryProposalTool: true,
      filterOocFromHistory: true,
    })

    if (pendingMessage && pendingMessage.trim()) {
      context.messages.push({ role: "user", content: pendingMessage.trim() })
    }

    const totalCharacters = context.systemPrompt.length +
      context.messages.reduce((acc, m) => acc + m.content.length, 0)

    const metadata: PromptContextMetadataDTO = {
      characterName: characterVersion?.name ?? "Unknown",
      characterVersion: characterVersion?.versionNumber ?? 0,
      summaryId: summary?.id ?? null,
      memoryCount: promptMemories.length,
      recentMessageCount: conv.recentMessageCount,
      totalContextMessages: context.messages.length,
      totalCharacters,
    }

    return {
      systemPrompt: context.systemPrompt,
      messages: context.messages,
      metadata,
    }
  }
}
