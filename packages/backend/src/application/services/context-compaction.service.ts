import type { SummaryDTO } from "@workspace/shared/types/summary"
import type { Locale } from "@workspace/shared/i18n"
import { translate } from "@workspace/shared/i18n"
import {
  resolveCompactionTarget,
} from "@workspace/shared/lib/compaction"
import { estimateContextTokens, estimateTextTokens } from "@workspace/shared/lib/token-estimate"

import type { CharacterVersion } from "../../domain/entities/character-version.entity"
import type { Conversation } from "../../domain/entities/conversation.entity"
import type { Memory } from "../../domain/entities/memory.entity"
import type { Message } from "../../domain/entities/message.entity"
import type { Summary } from "../../domain/entities/summary.entity"
import type { PromptContextBuilder } from "../../domain/ports/prompt-context-builder"
import type { Logger } from "../../domain/ports/logger.port"
import type { GenerateSummaryUseCase } from "../use-cases/summary/generate-summary.use-case"
import { Summary as SummaryEntity } from "../../domain/entities/summary.entity"

export interface ContextCompactionInput {
  conversation: Conversation
  characterVersion: CharacterVersion
  /** Messages after the previous summary boundary, including the pending one. */
  messages: Message[]
  memories: Memory[]
  playerCharacter?: { name: string; description: string }
  latestSummary: Summary | null
  locale?: Locale
}

export interface ContextCompactionWarning {
  code: "SUMMARY_FAILED_TRIMMED" | "CONTEXT_TRIMMED"
  message: string
}

export interface ContextCompactionSuccess {
  ok: true
  messages: Message[]
  summary: Summary | null
  compacted: boolean
  summaryGenerated: SummaryDTO | null
  warning: ContextCompactionWarning | null
}

export interface ContextCompactionFailure {
  ok: false
  error: { code: "CONTEXT_TOO_LARGE"; message: string }
}

export type ContextCompactionResult =
  | ContextCompactionSuccess
  | ContextCompactionFailure

const DEFAULT_OUTPUT_RESERVE = 2_048
const MESSAGE_OVERHEAD_TOKENS = 4
const MIN_SUMMARY_BUDGET = 256
const MAX_SUMMARY_BUDGET = 1_024

/**
 * Keeps the prompt inside the model window before a reply is generated.
 *
 * The context is built with the previous summary plus every unsummarized
 * message. If it exceeds the conversation threshold, the oldest messages are
 * summarized and only the newest messages that fit are kept verbatim. When the
 * summary fails, the oldest messages are trimmed and the caller gets a warning
 * instead of an oversized prompt.
 */
export class ContextCompactionService {
  constructor(
    private readonly promptContextBuilder: PromptContextBuilder,
    private readonly generateSummary: GenerateSummaryUseCase,
    private readonly logger: Logger,
  ) {}

  async needsCompaction(input: ContextCompactionInput): Promise<boolean> {
    const window = input.conversation.contextWindow
    if (!window || window <= 0) return false

    const current = await this.buildContext(
      input,
      input.latestSummary,
      input.messages,
    )
    const threshold = window * (input.conversation.compactionThreshold / 100)
    return current.estimate.totalTokens >= threshold
  }

  async compact(input: ContextCompactionInput): Promise<ContextCompactionResult> {
    const window = input.conversation.contextWindow
    if (!window || window <= 0) {
      return this.unchanged(input)
    }
    if (input.messages.length === 0) {
      const context = await this.buildContext(input, input.latestSummary, [])
      const threshold = window * (input.conversation.compactionThreshold / 100)
      return context.estimate.totalTokens >= threshold
        ? this.tooLarge(input.locale)
        : this.unchanged(input)
    }

    const threshold = window * (input.conversation.compactionThreshold / 100)
    const outputReserve = input.conversation.maxTokens ?? DEFAULT_OUTPUT_RESERVE
    const current = await this.buildContext(
      input,
      input.latestSummary,
      input.messages,
    )
    if (current.estimate.totalTokens < threshold) {
      return this.unchanged(input)
    }

    const targetRatio =
      resolveCompactionTarget(input.conversation.compactionThreshold) / 100
    const thresholdBudget = Math.max(1, Math.floor(threshold) - outputReserve)
    const targetBudget = Math.max(1, Math.floor(window * targetRatio) - outputReserve)
    const summaryBudget = Math.min(
      MAX_SUMMARY_BUDGET,
      Math.max(MIN_SUMMARY_BUDGET, Math.floor(window * 0.1)),
    )

    const base = await this.buildContext(input, undefined, [])
    const keepBudget = Math.max(
      0,
      targetBudget - base.estimate.systemTokens - summaryBudget,
    )
    const kept = selectKeptMessages(input.messages, keepBudget)
    const prefix = input.messages.slice(0, input.messages.length - kept.length)

    if (prefix.length === 0) {
      return this.tooLarge(input.locale)
    }

    const summaryResult = await this.generateSummary.execute(
      input.conversation.id,
      {
        locale: input.locale,
        upToMessageId: prefix[prefix.length - 1].id,
        maxTokens: summaryBudget,
      },
    )

    if (summaryResult.error || !summaryResult.summary) {
      this.logger.warn("Context compaction summary failed; trimming", {
        conversationId: input.conversation.id,
        code: summaryResult.error?.code,
      })
      return this.trimWithoutSummary(input, kept, thresholdBudget)
    }

    const summary = toSummaryEntity(summaryResult.summary)
    let finalMessages = kept
    let final = await this.buildContext(input, summary, finalMessages)

    while (final.estimate.totalTokens > thresholdBudget && finalMessages.length > 2) {
      finalMessages = finalMessages.slice(1)
      final = await this.buildContext(input, summary, finalMessages)
    }

    if (final.estimate.totalTokens > thresholdBudget) {
      return this.tooLarge(input.locale)
    }

    return {
      ok: true,
      messages: finalMessages,
      summary,
      compacted: true,
      summaryGenerated: summaryResult.summary,
      warning:
        finalMessages.length < kept.length
          ? {
              code: "CONTEXT_TRIMMED",
              message: translate(input.locale ?? "en", "chat.compactionTrimmed"),
            }
          : null,
    }
  }

  private async trimWithoutSummary(
    input: ContextCompactionInput,
    kept: Message[],
    thresholdBudget: number,
  ): Promise<ContextCompactionResult> {
    let messages = kept
    let final = await this.buildContext(input, input.latestSummary, messages)

    while (final.estimate.totalTokens > thresholdBudget && messages.length > 2) {
      messages = messages.slice(1)
      final = await this.buildContext(input, input.latestSummary, messages)
    }

    if (final.estimate.totalTokens > thresholdBudget) {
      return this.tooLarge(input.locale)
    }

    return {
      ok: true,
      messages,
      summary: input.latestSummary,
      compacted: true,
      summaryGenerated: null,
      warning: {
        code: "SUMMARY_FAILED_TRIMMED",
        message: translate(input.locale ?? "en", "chat.compactionSummaryFailed"),
      },
    }
  }

  private unchanged(input: ContextCompactionInput): ContextCompactionSuccess {
    return {
      ok: true,
      messages: input.messages,
      summary: input.latestSummary,
      compacted: false,
      summaryGenerated: null,
      warning: null,
    }
  }

  private tooLarge(locale?: Locale): ContextCompactionFailure {
    return {
      ok: false,
      error: {
        code: "CONTEXT_TOO_LARGE",
        message: translate(locale ?? "en", "errors.CONTEXT_TOO_LARGE"),
      },
    }
  }

  private async buildContext(
    input: ContextCompactionInput,
    summary: Summary | null | undefined,
    messages: Message[],
  ) {
    const context = await this.promptContextBuilder.build({
      characterVersion: input.characterVersion,
      messages,
      recentMessageCount: messages.length,
      memories: input.memories,
      summary: summary ?? undefined,
      playerCharacter: input.playerCharacter,
      locale: input.locale,
      enableMemoryProposalTool: true,
      filterOocFromHistory: true,
    })
    const estimate = estimateContextTokens({
      systemPrompt: context.systemPrompt,
      messages: context.messages,
      outputReserve:
        input.conversation.maxTokens ?? DEFAULT_OUTPUT_RESERVE,
      contextWindow: input.conversation.contextWindow,
    })
    return { context, estimate }
  }
}

/**
 * Selects the newest messages that fit the keep budget. At least the last
 * user turn is kept; the loop starts at the newest message and walks back.
 */
function selectKeptMessages(messages: Message[], keepBudget: number): Message[] {
  const kept: Message[] = []
  let used = 0
  let sawUser = false

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    const cost = estimateTextTokens(message.content) + MESSAGE_OVERHEAD_TOKENS
    if (kept.length > 0 && sawUser && used + cost > keepBudget) break
    kept.unshift(message)
    used += cost
    if (message.role === "user") sawUser = true
  }

  while (kept.length > 1 && kept[0].role === "assistant") {
    kept.shift()
  }
  return kept
}

function toSummaryEntity(summary: SummaryDTO): Summary {
  return SummaryEntity.reconstruct({
    id: summary.id,
    conversationId: summary.conversationId,
    content: summary.content,
    firstMessageId: summary.firstMessageId,
    lastMessageId: summary.lastMessageId,
    model: summary.model,
    provider: summary.provider,
    createdAt: new Date(summary.createdAt),
    editedAt: summary.editedAt ? new Date(summary.editedAt) : null,
  })
}
