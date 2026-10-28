import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { resolvePlayerCharacterPrompt } from "./resolve-player-character"
import type { PromptContextDTO, PromptContextMetadataDTO } from "@workspace/shared/types/context"
import { filterMemoriesForPrompt } from "../../../lib/memory-decay"
import { estimateContextTokens } from "@workspace/shared/lib/token-estimate"
import {
  ConversationNotFoundError,
} from "../../../domain/errors"
import type { Locale } from "@workspace/shared/i18n"

export class GetPromptContextUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly messageHistoryRepository: MessageHistoryRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly promptContextBuilder: PromptContextBuilder,
    private readonly playerCharacterRepository: PlayerCharacterRepository,
  ) {}

  async execute(
    conversationId: string,
    pendingMessage?: string,
    locale?: Locale,
  ): Promise<PromptContextDTO> {
    const conv = await this.conversationRepository.findById(conversationId)
    if (!conv) {
      throw new ConversationNotFoundError(conversationId)
    }

    const characterVersion = await this.characterRepository.findVersionById(conv.versionId)
    const memories = await this.memoryRepository.findByConversationId(conversationId)
    const summary = await this.summaryRepository.findLatestByConversationId(conversationId)
    const summaryPosition = summary
      ? await this.messageHistoryRepository.findPositionById(summary.lastMessageId)
      : null
    const contextMessages =
      await this.messageHistoryRepository.findAfterPosition(
        conversationId,
        summaryPosition ?? -1,
      )
    const memoryTurns = (
      await this.messageHistoryRepository.findUserMessageTimes(conversationId)
    ).map((createdAt) => ({ role: "user", createdAt }))

    const promptMemories = filterMemoriesForPrompt(conv, memories, memoryTurns)

    const playerCharacter = await resolvePlayerCharacterPrompt(
      this.playerCharacterRepository,
      conv,
    )

    const context = await this.promptContextBuilder.build({
      characterVersion: characterVersion!,
      messages: contextMessages,
      recentMessageCount: contextMessages.length,
      memories: promptMemories,
      summary: summary ?? undefined,
      playerCharacter,
      locale,
      enableMemoryProposalTool: true,
      filterOocFromHistory: true,
    })

    if (pendingMessage && pendingMessage.trim()) {
      context.messages.push({ role: "user", content: pendingMessage.trim() })
    }

    const totalCharacters = context.systemPrompt.length +
      context.messages.reduce((acc, m) => acc + m.content.length, 0)
    const tokenEstimate = estimateContextTokens({
      systemPrompt: context.systemPrompt,
      messages: context.messages,
      outputReserve: conv.maxTokens ?? 2048,
      contextWindow: conv.contextWindow,
    })

    const metadata: PromptContextMetadataDTO = {
      characterName: characterVersion?.name ?? "Unknown",
      characterVersion: characterVersion?.versionNumber ?? 0,
      summaryId: summary?.id ?? null,
      memoryCount: promptMemories.length,
      recentMessageCount: context.messages.length,
      totalContextMessages: context.messages.length,
      totalCharacters,
      ...tokenEstimate,
      compactionThreshold: conv.compactionThreshold,
    }

    return {
      systemPrompt: context.systemPrompt,
      messages: context.messages,
      metadata,
    }
  }
}
