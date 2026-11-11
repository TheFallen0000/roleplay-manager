import type { Character } from "../../domain/entities/character.entity"
import type { CharacterVersion } from "../../domain/entities/character-version.entity"
import type { Conversation } from "../../domain/entities/conversation.entity"
import type { Memory } from "../../domain/entities/memory.entity"
import type { Message } from "../../domain/entities/message.entity"
import type { Summary } from "../../domain/entities/summary.entity"
import type { CharacterRepository } from "../../domain/ports/character.repository"
import type { ConversationRepository } from "../../domain/ports/conversation.repository"
import type { MemoryRepository } from "../../domain/ports/memory.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../../domain/ports/message.repository"
import type { LorebookRepository } from "../../domain/ports/lorebook.repository"
import type { PromptContextLorebook } from "../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../domain/ports/player-character.repository"
import type { SummaryRepository } from "../../domain/ports/summary.repository"
import {
  CharacterNotFoundError,
  CharacterVersionNotFoundError,
  ConversationNotFoundError,
} from "../../domain/errors"
import { filterMemoriesForPrompt } from "../../lib/memory-decay"
import { loadMessagesAfterSummary } from "../use-cases/conversation/load-messages-after-summary"
import {
  resolvePlayerCharacterPrompt,
  type PlayerCharacterPrompt,
} from "../use-cases/conversation/resolve-player-character"
import { LorebookActivationService } from "./lorebook-activation.service"

export interface ConversationContextLoaderDeps {
  conversationRepository: ConversationRepository
  characterRepository: CharacterRepository
  messageHistoryRepository: MessageHistoryRepository
  messageRepository: MessageRepository
  memoryRepository: MemoryRepository
  summaryRepository: SummaryRepository
  playerCharacterRepository: PlayerCharacterRepository
  lorebookRepository?: LorebookRepository
}

export interface ConversationContextLoadInput {
  conversationId: string
  /** Conversation already resolved by the caller; skips the repository lookup. */
  conversation?: Conversation
  /** Messages not yet guaranteed to be visible through the repository. */
  pendingMessages?: Message[]
  /** Regenerate: the assistant message being replaced is not context. */
  excludeMessageId?: string
}

export interface ConversationContextLoadResult {
  conversation: Conversation
  characterVersion: CharacterVersion
  character: Character
  latestSummary: Summary | null
  messagesAfterSummary: Message[]
  pendingMessages: Message[]
  excludedMessageId: string | null
  messages: Message[]
  memories: Memory[]
  promptMemories: Memory[]
  playerCharacter: PlayerCharacterPrompt | undefined
  lorebook?: PromptContextLorebook
}

/**
 * Single source of truth for the data that feeds prompt assembly. Both the
 * preview and the real send go through it so their selection cannot drift.
 */
export class ConversationContextLoader {
  private readonly lorebookActivation = new LorebookActivationService()

  constructor(private readonly deps: ConversationContextLoaderDeps) {}

  async load(
    input: ConversationContextLoadInput,
  ): Promise<ConversationContextLoadResult> {
    const { conversationId } = input
    const conversation =
      input.conversation ??
      (await this.deps.conversationRepository.findById(conversationId))
    if (!conversation || conversation.id !== conversationId) {
      throw new ConversationNotFoundError(conversationId)
    }

    // Conversations stay pinned to the version they were created with; editing
    // the character creates a new version without rewriting existing chats.
    const characterVersion =
      await this.deps.characterRepository.findVersionById(conversation.versionId)
    if (!characterVersion) {
      throw new CharacterVersionNotFoundError(conversation.versionId)
    }

    const characterResult = await this.deps.characterRepository.findById(
      characterVersion.characterId,
    )
    if (!characterResult) {
      throw new CharacterNotFoundError(characterVersion.characterId)
    }

    const latestSummary =
      await this.deps.summaryRepository.findLatestByConversationId(
        conversation.id,
      )
    const messagesAfterSummary = await loadMessagesAfterSummary({
      conversationId: conversation.id,
      summary: latestSummary,
      messageHistoryRepository: this.deps.messageHistoryRepository,
      messageRepository: this.deps.messageRepository,
    })

    const loadedIds = new Set(messagesAfterSummary.map((message) => message.id))
    const pendingMessages = (input.pendingMessages ?? []).filter(
      (message) => !loadedIds.has(message.id),
    )
    const candidateMessages = [...messagesAfterSummary, ...pendingMessages]
    const excludedMessageId =
      input.excludeMessageId &&
      candidateMessages.some(
        (message) => message.id === input.excludeMessageId,
      )
        ? input.excludeMessageId
        : null
    const messages = excludedMessageId
      ? candidateMessages.filter((message) => message.id !== excludedMessageId)
      : candidateMessages

    const memories = await this.deps.memoryRepository.findByConversationId(
      conversation.id,
    )
    const memoryTurns = (
      await this.deps.messageHistoryRepository.findUserMessageTimes(
        conversation.id,
      )
    ).map((createdAt) => ({ role: "user", createdAt }))
    const promptMemories = filterMemoriesForPrompt(
      conversation,
      memories,
      memoryTurns,
    )

    const playerCharacter = await resolvePlayerCharacterPrompt(
      this.deps.playerCharacterRepository,
      conversation,
    )

    const lorebook = await this.loadLorebook(characterVersion.characterId, messages)

    return {
      conversation,
      characterVersion,
      character: characterResult.character,
      latestSummary,
      messagesAfterSummary,
      pendingMessages,
      excludedMessageId,
      messages,
      memories,
      promptMemories,
      playerCharacter,
      ...(lorebook ? { lorebook } : {}),
    }
  }

  private async loadLorebook(
    characterId: string,
    messages: Message[],
  ): Promise<PromptContextLorebook | null> {
    const repository = this.deps.lorebookRepository
    if (!repository) return null

    const lorebook = await repository.findByCharacterId(characterId)
    if (!lorebook) return null

    const activated = await this.lorebookActivation.activate({
      book: lorebook.book,
      entries: lorebook.entries,
      messages,
    })

    return {
      before: activated.before.map((entry) => ({
        id: entry.id,
        content: entry.content,
      })),
      after: activated.after.map((entry) => ({
        id: entry.id,
        content: entry.content,
      })),
      overBudgetCount: activated.overBudgetCount,
    }
  }
}
