import type { SummaryDTO } from "@workspace/shared/types/summary"
import type { Locale } from "@workspace/shared/i18n"
import { translate } from "@workspace/shared/i18n"
import { resolveCompactionTarget } from "@workspace/shared/lib/compaction"
import {
  estimateContextTokens,
  estimateMessagesTokens,
  estimateTextTokens,
} from "@workspace/shared/lib/token-estimate"

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

export interface ContextCompactionOptions {
  /** Manual "compact now" can run even when the context is below threshold. */
  force?: boolean
  /** Manual compaction keeps at most this many recent messages. */
  keepRecentMessages?: number
}

export interface ContextCompactionWarning {
  code:
    | "SUMMARY_FAILED_TRIMMED"
    | "SUMMARY_DROPPED"
    | "CONTEXT_TRIMMED"
    | "OUTPUT_REDUCED"
  message: string
}

export interface ContextCompactionSuccess {
  ok: true
  messages: Message[]
  summary: Summary | null
  compacted: boolean
  summaryGenerated: SummaryDTO | null
  /** Effective reply budget after fitting the context. */
  outputTokens: number
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
const MIN_OUTPUT_RESERVE = 256
const MIN_SUMMARY_BUDGET = 128
const MAX_SUMMARY_BUDGET = 1_024
const MESSAGE_OVERHEAD_TOKENS = 4

/**
 * Keeps the prompt inside the model window before a reply is generated.
 *
 * The context is built with the previous summary plus every unsummarized
 * message. If it exceeds the conversation threshold, the oldest messages are
 * summarized and only the newest messages that fit are kept verbatim. The
 * summary budget is calculated from the real room left after the system prompt,
 * the minimum recent messages and the reply reserve; if the reply reserve is
 * what makes it impossible, it is reduced for this request and the caller gets
 * a warning. When even that fails, old messages are trimmed and, as a last
 * resort, the summary is dropped instead of blocking the conversation.
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

  async compact(
    input: ContextCompactionInput,
    options: ContextCompactionOptions = {},
  ): Promise<ContextCompactionResult> {
    const window = input.conversation.contextWindow
    const desiredOutput =
      input.conversation.maxTokens ?? DEFAULT_OUTPUT_RESERVE
    if (!window || window <= 0) {
      return this.unchanged(input, desiredOutput)
    }
    if (input.messages.length === 0) {
      const context = await this.buildContext(input, input.latestSummary, [])
      const threshold = window * (input.conversation.compactionThreshold / 100)
      return context.estimate.totalTokens >= threshold
        ? this.tooLarge(input.locale)
        : this.unchanged(input, desiredOutput)
    }

    const threshold = window * (input.conversation.compactionThreshold / 100)
    const totalBudget = Math.floor(threshold)
    const current = await this.buildContext(
      input,
      input.latestSummary,
      input.messages,
    )
    if (!options.force && current.estimate.totalTokens < threshold) {
      return this.unchanged(input, desiredOutput)
    }

    const targetRatio =
      resolveCompactionTarget(input.conversation.compactionThreshold) / 100
    const base = await this.buildContext(input, undefined, [])
    const minimumKept = selectKeptMessages(input.messages, 0)
    const minimumKeptTokens = estimateMessagesTokens(minimumKept)
    const fixedTokens = base.estimate.systemTokens + minimumKeptTokens

    const preferredSummary = Math.min(
      MAX_SUMMARY_BUDGET,
      Math.max(256, Math.floor(window * 0.1)),
    )
    let outputTokens = desiredOutput
    let summaryBudget = preferredSummary

    if (fixedTokens + summaryBudget + outputTokens > totalBudget) {
      summaryBudget = Math.max(0, totalBudget - fixedTokens - outputTokens)
    }
    if (summaryBudget < MIN_SUMMARY_BUDGET) {
      const outputForMinSummary =
        totalBudget - fixedTokens - MIN_SUMMARY_BUDGET
      if (outputForMinSummary >= MIN_OUTPUT_RESERVE) {
        outputTokens = Math.min(desiredOutput, outputForMinSummary)
        summaryBudget = MIN_SUMMARY_BUDGET
      } else {
        outputTokens = Math.min(
          desiredOutput,
          Math.max(MIN_OUTPUT_RESERVE, totalBudget - fixedTokens),
        )
        summaryBudget = 0
      }
    }

    if (fixedTokens + outputTokens > totalBudget) {
      return this.tooLarge(input.locale)
    }

    const outputReduced = outputTokens < desiredOutput
    const thresholdBudget = Math.max(1, totalBudget - outputTokens)
    const targetBudget = Math.max(
      1,
      Math.floor(window * targetRatio) - outputTokens,
    )
    const keepBudget = Math.max(
      0,
      targetBudget - base.estimate.systemTokens - summaryBudget,
    )
    let kept = selectKeptMessages(
      input.messages,
      keepBudget,
      options.keepRecentMessages,
    )
    let prefix = input.messages.slice(0, input.messages.length - kept.length)

    if (
      prefix.length === 0 &&
      options.force &&
      options.keepRecentMessages !== undefined &&
      input.messages.length > options.keepRecentMessages
    ) {
      kept = trimLeadingAssistants(
        input.messages.slice(-options.keepRecentMessages),
      )
      prefix = input.messages.slice(0, input.messages.length - kept.length)
    }

    if (prefix.length === 0) {
      if (options.force) return this.unchanged(input, desiredOutput)
      return this.trimWithoutSummary(
        input,
        input.messages,
        thresholdBudget,
        minimumKept.length,
        outputTokens,
        input.latestSummary,
        "NONE",
        outputReduced,
      )
    }

    if (summaryBudget < MIN_SUMMARY_BUDGET) {
      return this.trimWithoutSummary(
        input,
        kept,
        thresholdBudget,
        minimumKept.length,
        outputTokens,
        input.latestSummary,
        "SUMMARY_FAILED_TRIMMED",
        outputReduced,
      )
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
      return this.trimWithoutSummary(
        input,
        kept,
        thresholdBudget,
        minimumKept.length,
        outputTokens,
        input.latestSummary,
        "SUMMARY_FAILED_TRIMMED",
        outputReduced,
      )
    }

    const summary = toSummaryEntity(summaryResult.summary)
    let finalMessages = kept
    let final = await this.buildContext(input, summary, finalMessages)

    while (
      final.estimate.inputTokens > thresholdBudget &&
      finalMessages.length > minimumKept.length
    ) {
      finalMessages = finalMessages.slice(1)
      final = await this.buildContext(input, summary, finalMessages)
    }

    if (final.estimate.inputTokens > thresholdBudget) {
      this.logger.warn("Compacted summary did not fit; dropping it", {
        conversationId: input.conversation.id,
        summaryTokens: summary.content.length,
      })
      return this.trimWithoutSummary(
        input,
        finalMessages,
        thresholdBudget,
        minimumKept.length,
        outputTokens,
        null,
        "SUMMARY_DROPPED",
        outputReduced,
        summaryResult.summary,
      )
    }

    return {
      ok: true,
      messages: finalMessages,
      summary,
      compacted: true,
      summaryGenerated: summaryResult.summary,
      outputTokens,
      warning: this.pickWarning(input.locale, {
        outputReduced,
        outputTokens,
        trimmed: finalMessages.length < kept.length,
        summaryDropped: false,
      }),
    }
  }

  private async trimWithoutSummary(
    input: ContextCompactionInput,
    kept: Message[],
    thresholdBudget: number,
    minimumKeptLength: number,
    outputTokens: number,
    summary: Summary | null,
    warningCode: "SUMMARY_FAILED_TRIMMED" | "SUMMARY_DROPPED" | "NONE",
    outputReduced: boolean,
    summaryGenerated: SummaryDTO | null = null,
  ): Promise<ContextCompactionResult> {
    let messages = kept
    let sourceSummary = summary
    let final = await this.buildContext(input, sourceSummary, messages)

    while (
      final.estimate.inputTokens > thresholdBudget &&
      messages.length > minimumKeptLength
    ) {
      messages = messages.slice(1)
      final = await this.buildContext(input, sourceSummary, messages)
    }

    // The previous summary itself may be the part that does not fit. Dropping
    // it is lossy, but it keeps the conversation usable instead of failing.
    if (final.estimate.inputTokens > thresholdBudget && sourceSummary !== null) {
      sourceSummary = null
      final = await this.buildContext(input, null, messages)
      while (
        final.estimate.inputTokens > thresholdBudget &&
        messages.length > minimumKeptLength
      ) {
        messages = messages.slice(1)
        final = await this.buildContext(input, null, messages)
      }
    }

    if (final.estimate.inputTokens > thresholdBudget) {
      return this.tooLarge(input.locale)
    }

    const summaryDropped = sourceSummary === null && summary !== null
    return {
      ok: true,
      messages,
      summary: sourceSummary,
      compacted: true,
      summaryGenerated,
      outputTokens,
      warning: this.pickWarning(input.locale, {
        outputReduced,
        outputTokens,
        trimmed: messages.length < kept.length,
        summaryDropped: warningCode === "SUMMARY_DROPPED" || summaryDropped,
        summaryFailed:
          !summaryDropped && warningCode === "SUMMARY_FAILED_TRIMMED",
        warningCodeNone: warningCode === "NONE" && !summaryDropped,
      }),
    }
  }

  private pickWarning(
    locale: Locale | undefined,
    options: {
      outputReduced: boolean
      outputTokens: number
      trimmed: boolean
      summaryDropped: boolean
      summaryFailed?: boolean
      warningCodeNone?: boolean
    },
  ): ContextCompactionWarning | null {
    const language = locale ?? "en"
    if (options.summaryDropped) {
      return {
        code: "SUMMARY_DROPPED",
        message: translate(language, "chat.compactionSummaryDropped"),
      }
    }
    if (options.summaryFailed && !options.warningCodeNone) {
      return {
        code: "SUMMARY_FAILED_TRIMMED",
        message: translate(language, "chat.compactionSummaryFailed"),
      }
    }
    if (options.trimmed) {
      return {
        code: "CONTEXT_TRIMMED",
        message: translate(language, "chat.compactionTrimmed"),
      }
    }
    if (options.outputReduced) {
      return {
        code: "OUTPUT_REDUCED",
        message: translate(language, "chat.compactionOutputReduced", {
          count: options.outputTokens,
        }),
      }
    }
    return null
  }

  private unchanged(
    input: ContextCompactionInput,
    outputTokens: number,
  ): ContextCompactionSuccess {
    return {
      ok: true,
      messages: input.messages,
      summary: input.latestSummary,
      compacted: false,
      summaryGenerated: null,
      outputTokens,
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
      outputReserve: input.conversation.maxTokens ?? DEFAULT_OUTPUT_RESERVE,
      contextWindow: input.conversation.contextWindow,
    })
    return { context, estimate }
  }
}

/**
 * Selects the newest messages that fit the keep budget. At least the last
 * user turn is kept; the loop starts at the newest message and walks back.
 */
function selectKeptMessages(
  messages: Message[],
  keepBudget: number,
  maxKept?: number,
): Message[] {
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

  let result = trimLeadingAssistants(kept)
  if (maxKept !== undefined && result.length > maxKept) {
    result = trimLeadingAssistants(result.slice(-maxKept))
  }
  return result
}

function trimLeadingAssistants(messages: Message[]): Message[] {
  let start = 0
  while (start < messages.length - 1 && messages[start].role === "assistant") {
    start += 1
  }
  return messages.slice(start)
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
