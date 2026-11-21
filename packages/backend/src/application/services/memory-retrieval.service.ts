import { resolveEffectiveWindow } from "@workspace/shared/lib/context-window"
import { estimateTextTokens } from "@workspace/shared/lib/token-estimate"
import { translate, type Locale } from "@workspace/shared/i18n"
import type {
  ContextManifestMemorySelectionDTO,
  MemorySelectionReason,
} from "@workspace/shared/types/context"
import type { MemoryType } from "@workspace/shared/types/memory"

import type { Conversation } from "../../domain/entities/conversation.entity"
import type { Memory } from "../../domain/entities/memory.entity"
import { MemoryDecayPolicy } from "../../domain/value-objects/memory-decay-policy"
import {
  containsMemoryPhrase,
  memoryKeywordTokens,
  normalizeMemoryText,
  tokenizeMemoryText,
} from "../../lib/memory-text"

export interface SelectMemoriesInput {
  conversation: Conversation
  memories: Memory[]
  messages: readonly { role: string; createdAt: Date }[]
  pendingMessage: string
  mainActors: readonly string[]
}

export interface SelectMemoriesResult {
  memories: Memory[]
  selection: ContextManifestMemorySelectionDTO[]
  tokens: number
  budget: number
}

const DEFAULT_MEMORY_BUDGET = 512
const MIN_MEMORY_BUDGET = 256
const MAX_MEMORY_BUDGET = 2048
const BUDGET_RATIO = 0.12
const RECENCY_WINDOW = 50
const ACTOR_IN_PENDING_WEIGHT = 4
const MAIN_ACTOR_WEIGHT = 2
const KEYWORD_HIT_CAP = 5
const TYPE_WEIGHT: Record<MemoryType, number> = {
  thread: 1.5,
  fact: 1,
  episode: 0.5,
}

const RENDER_LOCALES: Locale[] = ["en", "es"]

export function selectMemoriesForPrompt(
  input: SelectMemoriesInput,
): SelectMemoriesResult {
  const policy = MemoryDecayPolicy.fromConversation(input.conversation)
  const pendingTokens = tokenizeMemoryText(input.pendingMessage)
  const pendingKeywords = new Set(memoryKeywordTokens(input.pendingMessage))
  const mainActors = new Set(
    input.mainActors.map((actor) => normalizeMemoryText(actor)),
  )

  const entries = input.memories.map((memory) => {
    const turns = policy.turnsSince(memory.updatedAt, input.messages)
    const effectivePriority = policy.effectivePriority(memory.priority, turns)
    // An open thread survives at the decay threshold: it is a pending promise,
    // not a durable fact that loses value as the conversation moves on.
    const eligible =
      memory.type === "thread"
        ? effectivePriority >= policy.threshold
        : policy.isPromptEligible(memory.priority, turns)
    if (!eligible) {
      return {
        memory,
        included: false,
        score: 0,
        reason: "decay" as MemorySelectionReason,
      }
    }

    const actor = normalizeMemoryText(memory.actor)
    const actorInPending = containsMemoryPhrase(
      pendingTokens,
      tokenizeMemoryText(memory.actor),
    )
    const mainActor = mainActors.has(actor)
    const keywordHits = countKeywordHits(memory, pendingKeywords)
    const priorityScore = ((effectivePriority - 1) / 9) * 2
    const recency = Math.max(0, 1 - turns / RECENCY_WINDOW)

    const signal =
      (actorInPending ? ACTOR_IN_PENDING_WEIGHT : 0) +
      (mainActor ? MAIN_ACTOR_WEIGHT : 0) +
      Math.min(keywordHits, KEYWORD_HIT_CAP)
    const base = signal + priorityScore + recency
    const score = roundScore(base * TYPE_WEIGHT[memory.type])

    const reason: MemorySelectionReason =
      actorInPending || mainActor
        ? "actor"
        : keywordHits > 0
          ? "keyword"
          : memory.type === "thread"
            ? "thread"
            : "priority"

    const hasSignal =
      actorInPending ||
      mainActor ||
      keywordHits > 0 ||
      memory.type === "thread" ||
      effectivePriority >= 8

    return {
      memory,
      included: hasSignal,
      score: hasSignal ? score : 0,
      reason: hasSignal ? reason : ("not-relevant" as MemorySelectionReason),
    }
  })

  const ordered = entries
    .filter((entry) => entry.included)
    .sort(compareEntries)

  const budget = resolveMemoryBudget(input.conversation)
  const included: Memory[] = []
  const budgetIds = new Set<string>()
  for (const entry of ordered) {
    const candidate = [...included, entry.memory]
    if (renderMemoryTokens(candidate) <= budget) {
      included.push(entry.memory)
    } else {
      budgetIds.add(entry.memory.id)
    }
  }

  const finalEntries = entries.map((entry) => ({
    memory: entry.memory,
    included: entry.included && !budgetIds.has(entry.memory.id),
    score: entry.score,
    reason: budgetIds.has(entry.memory.id)
      ? ("budget" as MemorySelectionReason)
      : entry.reason,
  }))
  const includedEntries = finalEntries
    .filter((entry) => entry.included)
    .sort(compareEntries)
  let next = 0
  // Included entries fill their original slots in score order: the manifest
  // keeps one entry per memory while `memorySelection.filter(included)` follows
  // the prompt order.
  const selection = finalEntries.map((entry) =>
    entry.included
      ? toSelectionDTO(includedEntries[next++]!)
      : toSelectionDTO(entry),
  )

  return {
    memories: included,
    selection,
    tokens: renderMemoryTokens(included),
    budget,
  }
}

const toSelectionDTO = (entry: {
  memory: Memory
  included: boolean
  score: number
  reason: MemorySelectionReason
}): ContextManifestMemorySelectionDTO => ({
  id: entry.memory.id,
  included: entry.included,
  score: entry.score,
  reason: entry.reason,
})

const countKeywordHits = (
  memory: Memory,
  pendingKeywords: ReadonlySet<string>,
): number => {
  const keywords = memoryKeywordTokens(
    `${memory.title} ${memory.description} ${memory.actor}`,
  )
  let hits = 0
  for (const keyword of keywords) {
    if (pendingKeywords.has(keyword)) hits += 1
  }
  return hits
}

const compareEntries = (
  left: { memory: Memory; score: number },
  right: { memory: Memory; score: number },
): number => {
  if (right.score !== left.score) return right.score - left.score
  if (right.memory.priority !== left.memory.priority) {
    return right.memory.priority - left.memory.priority
  }
  const updated =
    right.memory.updatedAt.getTime() - left.memory.updatedAt.getTime()
  if (updated !== 0) return updated
  return left.memory.id < right.memory.id
    ? -1
    : left.memory.id > right.memory.id
      ? 1
      : 0
}

const roundScore = (value: number): number => Math.round(value * 1000) / 1000

export const resolveMemoryBudget = (conversation: Conversation): number => {
  const effective = resolveEffectiveWindow({
    contextWindow: conversation.contextWindow,
    workingWindow: conversation.workingWindow,
    maxTokens: conversation.maxTokens,
  })
  if (effective.window === null) return DEFAULT_MEMORY_BUDGET
  return Math.min(
    MAX_MEMORY_BUDGET,
    Math.max(MIN_MEMORY_BUDGET, Math.round(effective.window * BUDGET_RATIO)),
  )
}

/**
 * Token estimate of the rendered memory section. Both UI locales are measured
 * because the retrieval service does not receive a locale and the budget must
 * hold whichever one the caller uses.
 */
const renderMemoryTokens = (memories: readonly Memory[]): number => {
  if (memories.length === 0) return 0
  return Math.max(
    ...RENDER_LOCALES.map((locale) =>
      estimateTextTokens(renderMemorySection(memories, locale)),
    ),
  )
}

const renderMemorySection = (
  memories: readonly Memory[],
  locale: Locale,
): string => {
  const parts = [
    "",
    translate(locale, "prompt.memory"),
    translate(locale, "prompt.memoryHint"),
  ]
  for (const memory of memories) {
    parts.push(
      translate(locale, "prompt.memoryLine", {
        id: memory.id,
        actor: memory.actor,
        title: memory.title,
        description: memory.description,
        priority: memory.priority,
        type: memory.type,
      }),
    )
  }
  return parts.join("\n")
}
