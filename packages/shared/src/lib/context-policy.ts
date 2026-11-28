import {
  clampCompactionThreshold,
  DEFAULT_COMPACTION_THRESHOLD,
  resolveCompactionTarget,
} from "./compaction"
import { resolveEffectiveWindow } from "./context-window"

export type ContextPolicyId = "fast" | "balanced" | "deep"

export const CONTEXT_POLICY_IDS: ContextPolicyId[] = [
  "fast",
  "balanced",
  "deep",
]

export const DEFAULT_CONTEXT_POLICY: ContextPolicyId = "balanced"

export interface ContextSectionBudget {
  /** Fraction of the effective window assigned to the section. */
  ratio: number
  min: number
  max: number
  /** Budget used when the context window is unknown. */
  fallback: number
}

export interface ContextPolicy {
  id: ContextPolicyId
  /** Memory section budget of the chat prompt. */
  memory: ContextSectionBudget
  /** Summary output budget (the summary text written into the prompt). */
  summaryOutput: ContextSectionBudget
  /** Memory section budget of the summary prompt. */
  summaryMemory: ContextSectionBudget
  /** Default compaction threshold/target for conversations without one. */
  compaction: { threshold: number; target: number }
}

/**
 * Budget split for the three conversation context policies. `balanced` keeps
 * the pre-S138 chat and compaction constants (0.12/0.10 memory/summary and
 * 80/60 compaction); `fast` and `deep` trade memory and summary room for speed
 * or depth. The policy never changes the provider, the model or the reply
 * reserve, it only repartitions the input window.
 */
export const CONTEXT_POLICIES: Record<ContextPolicyId, ContextPolicy> = {
  fast: {
    id: "fast",
    memory: { ratio: 0.06, min: 128, max: 1_024, fallback: 256 },
    summaryOutput: { ratio: 0.05, min: 128, max: 512, fallback: 128 },
    summaryMemory: { ratio: 0.06, min: 128, max: 1_024, fallback: 256 },
    compaction: { threshold: 70, target: 50 },
  },
  balanced: {
    id: "balanced",
    memory: { ratio: 0.12, min: 256, max: 2_048, fallback: 512 },
    summaryOutput: { ratio: 0.1, min: 256, max: 1_024, fallback: 256 },
    summaryMemory: { ratio: 0.12, min: 256, max: 2_048, fallback: 512 },
    compaction: { threshold: 80, target: 60 },
  },
  deep: {
    id: "deep",
    memory: { ratio: 0.18, min: 256, max: 4_096, fallback: 1_024 },
    summaryOutput: { ratio: 0.15, min: 256, max: 2_048, fallback: 512 },
    summaryMemory: { ratio: 0.18, min: 256, max: 4_096, fallback: 1_024 },
    compaction: { threshold: 90, target: 70 },
  },
}

export const isContextPolicy = (value: unknown): value is ContextPolicyId =>
  typeof value === "string" &&
  (CONTEXT_POLICY_IDS as string[]).includes(value)

export const normalizeContextPolicy = (value: unknown): ContextPolicyId =>
  isContextPolicy(value) ? value : DEFAULT_CONTEXT_POLICY

export const getContextPolicy = (value: unknown): ContextPolicy =>
  CONTEXT_POLICIES[normalizeContextPolicy(value)]

export interface ContextBudgetPlan {
  /** Effective window used for every ratio; null when unknown. */
  window: number | null
  /** Reply tokens already excluded from `window` (0 in net mode). */
  outputReserve: number
  memoryBudget: number
  summaryOutputBudget: number
  summaryMemoryBudget: number
  compactionThreshold: number
  compactionTarget: number
}

export interface ResolveContextBudgetInput {
  policy: ContextPolicyId | string | null | undefined
  contextWindow: number | null | undefined
  workingWindow?: number | null
  maxTokens?: number | null
}

type BudgetRounding = "round" | "floor"

/**
 * Applies a section ratio to a window. `summaryOutput` floors to keep the S122
 * arithmetic exact (5735 * 0.10 = 573.5 -> 573); the memory sections round.
 */
const sectionBudget = (
  section: ContextSectionBudget,
  window: number | null,
  rounding: BudgetRounding = "round",
): number => {
  if (window === null) return section.fallback
  const raw = window * section.ratio
  const value = rounding === "floor" ? Math.floor(raw) : Math.round(raw)
  return Math.min(section.max, Math.max(section.min, value))
}

/**
 * Resolves the deterministic input budget for a conversation. The effective
 * window (S131) decides the room; each section clamps to its policy range and
 * the message history absorbs whatever is left, which is what compaction
 * already trims. With no window every section uses its policy fallback.
 */
export const resolveContextBudget = (
  input: ResolveContextBudgetInput,
): ContextBudgetPlan => {
  const policy = getContextPolicy(input.policy)
  const effective = resolveEffectiveWindow({
    contextWindow: input.contextWindow ?? null,
    workingWindow: input.workingWindow ?? null,
    maxTokens: input.maxTokens ?? null,
  })

  return {
    window: effective.window,
    outputReserve: effective.outputReserve,
    memoryBudget: sectionBudget(policy.memory, effective.window, "round"),
    summaryOutputBudget: sectionBudget(
      policy.summaryOutput,
      effective.window,
      "floor",
    ),
    summaryMemoryBudget: sectionBudget(
      policy.summaryMemory,
      effective.window,
      "round",
    ),
    compactionThreshold: policy.compaction.threshold,
    compactionTarget: policy.compaction.target,
  }
}

export interface EffectiveCompaction {
  threshold: number
  target: number
}

/**
 * A threshold that differs from the legacy default is a user-saved value and
 * always wins: its target comes from the standard margin. Otherwise the policy
 * provides the threshold/target pair as-is, without a second margin.
 */
export const hasStoredCompactionThreshold = (
  compactionThreshold: number | null | undefined,
): compactionThreshold is number =>
  compactionThreshold != null &&
  Number.isFinite(compactionThreshold) &&
  clampCompactionThreshold(compactionThreshold) !== DEFAULT_COMPACTION_THRESHOLD

export const resolveEffectiveCompaction = (input: {
  policy: ContextPolicyId | string | null | undefined
  compactionThreshold?: number | null
}): EffectiveCompaction => {
  if (hasStoredCompactionThreshold(input.compactionThreshold)) {
    const threshold = clampCompactionThreshold(input.compactionThreshold)
    return { threshold, target: resolveCompactionTarget(threshold) }
  }

  const policy = getContextPolicy(input.policy)
  return {
    threshold: policy.compaction.threshold,
    target: policy.compaction.target,
  }
}
