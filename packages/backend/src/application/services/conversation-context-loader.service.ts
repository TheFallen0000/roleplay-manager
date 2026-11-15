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
import {
  LorebookActivationService,
  type LorebookActivationEntryInput,
} from "./lorebook-activation.service"

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

    const lorebook = await this.loadLorebook(characterVersion, messages)

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
    characterVersion: CharacterVersion,
    messages: Message[],
  ): Promise<PromptContextLorebook | null> {
    const repository = this.deps.lorebookRepository
    if (!repository) return null

    const versionId = characterVersion.lorebookVersionId
    if (!versionId) return null

    // The version is immutable and read by id, so a soft-deleted container
    // keeps feeding the conversations pinned to it.
    const version = await repository.findVersionById(versionId)
    if (!version) return null

    const activated = await this.lorebookActivation.activate({
      book: {
        scanDepth: version.scanDepth,
        tokenBudget: version.tokenBudget,
        recursiveScanning: version.recursiveScanning,
      },
      entries: parseVersionEntries(version.entriesJson),
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
      versionNumber: version.versionNumber,
      sourceKey: version.sourceKey,
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asString = (value: unknown): string =>
  typeof value === "string" ? value : ""

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback

const asSelectiveLogic = (value: unknown): 0 | 1 | 2 | 3 =>
  value === 1 || value === 2 || value === 3 ? value : 0

const asPosition = (value: unknown): "before_char" | "after_char" =>
  value === "before_char" ? "before_char" : "after_char"

/**
 * `lorebook_versions.entries_json` stores the normalized entry snapshot; older
 * captures and hand-written fixtures omit fields the activation service needs,
 * so every missing value falls back to the entity defaults.
 */
const parseVersionEntries = (
  entriesJson: string,
): LorebookActivationEntryInput[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(entriesJson)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed.map((raw, index) => {
    const entry = isRecord(raw) ? raw : {}
    return {
      id: asString(entry.id) || asString(entry.sourceId) || `entry-${index}`,
      keys: asStringArray(entry.keys),
      secondaryKeys: asStringArray(entry.secondaryKeys),
      content: asString(entry.content),
      constant: asBoolean(entry.constant, false),
      selective: asBoolean(entry.selective, false),
      selectiveLogic: asSelectiveLogic(entry.selectiveLogic),
      insertionOrder: asNumber(entry.insertionOrder, 100),
      priority: asNumber(entry.priority, 0),
      enabled: asBoolean(entry.enabled, true),
      caseSensitive: asBoolean(entry.caseSensitive, false),
      wholeWords: asBoolean(entry.wholeWords, false),
      order: asNumber(entry.order, index),
      position: asPosition(entry.position),
      ...(typeof entry.useRegex === "boolean"
        ? { useRegex: entry.useRegex }
        : {}),
      unknownFields: entry.unknownFields ?? null,
    }
  })
}
