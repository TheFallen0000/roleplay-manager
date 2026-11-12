import { resolveEffectiveWindow } from "@workspace/shared/lib/context-window"
import {
  estimateMessagesTokens,
  estimateTextTokens,
} from "@workspace/shared/lib/token-estimate"
import type { ContextManifestDTO, ContextManifestSectionDTO } from "@workspace/shared/types/context"
import type { Locale } from "@workspace/shared/i18n"

import type { CharacterVersion } from "../../domain/entities/character-version.entity"
import type { Conversation } from "../../domain/entities/conversation.entity"
import type { Memory } from "../../domain/entities/memory.entity"
import type { Message } from "../../domain/entities/message.entity"
import type { Summary } from "../../domain/entities/summary.entity"
import type {
  PromptContextBuilder,
  PromptContextLorebook,
} from "../../domain/ports/prompt-context-builder"
import type { PromptContext } from "../../domain/value-objects/prompt-context"

export interface ContextCompileInput {
  conversation: Conversation
  characterVersion: CharacterVersion
  /** Messages after the summary boundary, including pending ones. */
  messages: Message[]
  /** How many of the last messages are pending (not persisted yet). */
  pendingCount: number
  /** Messages removed from the window (for example, being regenerated). */
  excludedCount: number
  /** Unfiltered memories, to report how many were excluded. */
  memories: Memory[]
  /** Memories actually sent in the system prompt. */
  promptMemories: Memory[]
  summary: Summary | null
  playerCharacter?: { name: string; description: string }
  lorebook?: PromptContextLorebook
  locale?: Locale
  outputReserve: number
  compaction: { needed: boolean; applied: boolean }
}

export interface CompiledContext {
  context: PromptContext
  manifest: ContextManifestDTO
}

const PENDING_REASON = "Pending messages not yet persisted"
const HISTORY_REASON = "Conversation history after the summary"

/**
 * Turns the selected sources into the final prompt plus a manifest that explains
 * it. Read-only: it does not persist, compact or call providers.
 */
export class ContextCompiler {
  constructor(private readonly promptContextBuilder: PromptContextBuilder) {}

  async compile(input: ContextCompileInput): Promise<CompiledContext> {
    const { context, sections } = await this.promptContextBuilder.buildWithSections(
      {
        characterVersion: input.characterVersion,
        messages: input.messages,
        recentMessageCount: input.messages.length,
        memories: input.promptMemories,
        summary: input.summary ?? undefined,
        playerCharacter: input.playerCharacter,
        lorebook: input.lorebook,
        locale: input.locale,
        enableMemoryProposalTool: true,
        filterOocFromHistory: true,
      },
    )

    const pendingCount = Math.min(
      Math.max(0, input.pendingCount),
      context.messages.length,
    )
    const historyMessages = context.messages.slice(
      0,
      context.messages.length - pendingCount,
    )
    const pendingMessages =
      pendingCount > 0 ? context.messages.slice(-pendingCount) : []

    const manifestSections: ContextManifestSectionDTO[] = sections.map(
      (section) => ({
        id: section.id,
        source: section.source,
        tokens: estimateTextTokens(section.content),
        characters: section.content.length,
        included: true,
        reason: section.reason,
        ...(section.itemCount !== undefined
          ? { itemCount: section.itemCount }
          : {}),
      }),
    )

    manifestSections.push({
      id: "history",
      source: "history",
      tokens: estimateMessagesTokens(historyMessages),
      characters: sumCharacters(historyMessages),
      included: historyMessages.length > 0,
      reason: HISTORY_REASON,
      itemCount: historyMessages.length,
    })

    if (pendingMessages.length > 0) {
      manifestSections.push({
        id: "pending",
        source: "pending",
        tokens: estimateMessagesTokens(pendingMessages),
        characters: sumCharacters(pendingMessages),
        included: true,
        reason: PENDING_REASON,
        itemCount: pendingMessages.length,
      })
    }

    const effective = resolveEffectiveWindow({
      contextWindow: input.conversation.contextWindow,
      workingWindow: input.conversation.workingWindow,
      maxTokens: input.conversation.maxTokens,
    })
    const outputReserve = effective.net ? 0 : input.outputReserve

    const estimatedInputTokens =
      estimateTextTokens(context.systemPrompt) +
      estimateMessagesTokens(context.messages)

    const manifest: ContextManifestDTO = {
      version: 1,
      model: input.conversation.model ?? null,
      contextWindow: effective.window,
      outputReserve,
      estimatedInputTokens,
      estimatedTotalTokens: estimatedInputTokens + outputReserve,
      compaction: {
        needed: input.compaction.needed,
        applied: input.compaction.applied,
        threshold: input.conversation.compactionThreshold,
      },
      summary: {
        id: input.summary?.id ?? null,
        firstMessageId: input.summary?.firstMessageId ?? null,
        lastMessageId: input.summary?.lastMessageId ?? null,
        messagesAfter: Math.max(
          0,
          input.messages.length - pendingCount + input.excludedCount,
        ),
      },
      memories: {
        total: input.memories.length,
        included: input.promptMemories.length,
        excluded: Math.max(
          0,
          input.memories.length - input.promptMemories.length,
        ),
      },
      ...(input.lorebook
        ? {
            lorebook: {
              overBudget: input.lorebook.overBudgetCount ?? 0,
              ...(input.lorebook.versionNumber !== undefined
                ? { versionNumber: input.lorebook.versionNumber }
                : {}),
              ...(input.lorebook.sourceKey !== undefined
                ? { sourceKey: input.lorebook.sourceKey }
                : {}),
            },
          }
        : {}),
      messages: {
        afterSummary: Math.max(
          0,
          input.messages.length - pendingCount + input.excludedCount,
        ),
        pending: pendingCount,
        excluded: input.excludedCount,
        total: input.messages.length + input.excludedCount,
      },
      sections: manifestSections,
    }

    return { context, manifest }
  }
}

const sumCharacters = (messages: readonly { content: string }[]): number =>
  messages.reduce((total, message) => total + message.content.length, 0)
