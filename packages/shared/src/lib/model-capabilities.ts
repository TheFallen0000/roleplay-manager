import type {
  CapabilityClaim,
  CapabilitySource,
  CapabilitySpecificity,
  CapabilityWarningCode,
  Confidence,
  CuratedModelEntry,
  ModelCapabilities,
  ModelIdentity,
  WorkingWindow,
  WorkingWindowStatus,
} from "../types/model-capabilities"

export const SAFETY_MARGIN_NUM = 5
export const SAFETY_MARGIN_DEN = 100
export const SAFETY_MARGIN_FLOOR = 128
export const MIN_WORKING_WINDOW = 256
export const DEFAULT_OUTPUT_RESERVE = 2_048

const OPENROUTER_PREFIX = "openrouter/"

const SOURCE_PRECEDENCE: Record<CapabilitySource, number> = {
  "manual-override": 0,
  "runtime-introspection": 1,
  "provider-api": 2,
  "curated-table": 3,
  heuristic: 4,
  default: 5,
}

const SPECIFICITY_PRECEDENCE: Record<CapabilitySpecificity, number> = {
  exact: 0,
  family: 1,
  alias: 2,
}

/**
 * Synonyms that differ by more than punctuation. Separator-only variants
 * ("llama-3" vs "llama3") are handled generically by `toAliasKey`.
 */
const MODEL_ALIAS_MAP: Readonly<Record<string, string>> = {
  "gpt-4o": "gpt-4o-2024-08-06",
  "gpt-4o-mini": "gpt-4o-mini-2024-07-18",
  "claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3.5-haiku": "claude-3-5-haiku-20241022",
  "mistral-large": "mistral-large-latest",
  "mistral-small": "mistral-small-latest",
}

// `:` is deliberately preserved so tags stay part of the identity.
const FAMILY_BOUNDARY = /[\s:/_.-]/

const normalizeModelName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ")

const stripOpenRouterPrefix = (value: string): string =>
  value.startsWith(OPENROUTER_PREFIX)
    ? value.slice(OPENROUTER_PREFIX.length)
    : value

const toAliasKey = (value: string): string => {
  const canonical = MODEL_ALIAS_MAP[value] ?? value
  return canonical.replace(/[-_\s.]+/g, "")
}

const isFamilyMatch = (target: string, entry: string): boolean =>
  entry.length > 0 &&
  target.length > entry.length &&
  target.startsWith(entry) &&
  FAMILY_BOUNDARY.test(target.charAt(entry.length))

export const normalizeModelIdentity = (
  provider: string,
  model: string,
  instanceId?: string | null
): ModelIdentity => ({
  provider,
  instanceId: instanceId ?? null,
  normalizedModel: stripOpenRouterPrefix(normalizeModelName(model)),
})

const PARAMETER_SIZE = /(?:^|[\s:_-])(\d+(?:\.\d+)?)b(?:\b|$)/i

/**
 * Conservative offline guess for local model names that carry a parameter
 * size (`qwen2.5:14b`, `llama-3-70b`, `mistral_7b`). It only supplies a rough
 * budget when neither the provider nor the curated table knows the model.
 */
export const inferModelCapabilitiesHeuristic = (
  normalizedModel: string
): { contextWindow?: number; maxOutputTokens?: number } | null => {
  const match = PARAMETER_SIZE.exec(normalizedModel)
  if (!match) return null
  const sizeInBillions = Number.parseFloat(match[1])
  if (!Number.isFinite(sizeInBillions) || sizeInBillions <= 0) return null
  if (sizeInBillions <= 4) return { contextWindow: 8_192, maxOutputTokens: 2_048 }
  if (sizeInBillions <= 9) return { contextWindow: 16_384, maxOutputTokens: 2_048 }
  if (sizeInBillions <= 34) return { contextWindow: 32_768, maxOutputTokens: 4_096 }
  return { contextWindow: 16_384, maxOutputTokens: 4_096 }
}

export const matchCuratedEntry = (
  normalizedModel: string,
  entryModel: string
): CapabilitySpecificity | null => {
  const target = normalizeModelName(normalizedModel)
  const entry = normalizeModelName(entryModel)
  if (entry.length === 0) return null
  if (target === entry) return "exact"
  if (isFamilyMatch(target, entry)) return "family"
  if (toAliasKey(target) === toAliasKey(entry)) return "alias"
  return null
}

interface FieldCandidate {
  value: number
  source: CapabilitySource
  confidence: Confidence
  specificity: CapabilitySpecificity
  order: number
}

interface ResolvedField {
  value: number | null
  source: CapabilitySource | null
  confidence: Confidence | null
}

interface ResolveModelCapabilitiesParams {
  target: { provider: string; model: string; instanceId?: string | null }
  claims?: readonly CapabilityClaim[]
  curatedTable?: readonly CuratedModelEntry[]
  heuristic?: { contextWindow?: number; maxOutputTokens?: number } | null
  defaults?: { contextWindow?: number; maxOutputTokens?: number }
  override?: { contextWindow?: number; maxOutputTokens?: number } | null
}

interface ComputeWorkingWindowParams {
  contextWindow: number | null
  requestedMaxTokens: number
  modelMaxOutputTokens: number | null
}

const toNumericValue = (value?: number | null): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

const pickCandidate = (
  candidates: readonly FieldCandidate[]
): ResolvedField => {
  let winner: FieldCandidate | undefined
  for (const candidate of candidates) {
    if (winner === undefined) {
      winner = candidate
      continue
    }
    const sourceDelta =
      SOURCE_PRECEDENCE[candidate.source] - SOURCE_PRECEDENCE[winner.source]
    if (sourceDelta < 0) {
      winner = candidate
      continue
    }
    if (sourceDelta > 0) continue
    const specificityDelta =
      SPECIFICITY_PRECEDENCE[candidate.specificity] -
      SPECIFICITY_PRECEDENCE[winner.specificity]
    if (specificityDelta < 0) {
      winner = candidate
      continue
    }
    if (specificityDelta > 0) continue
    if (candidate.order < winner.order) winner = candidate
  }
  if (winner === undefined) {
    return { value: null, source: null, confidence: null }
  }
  return {
    value: winner.value,
    source: winner.source,
    confidence: winner.confidence,
  }
}

export const resolveModelCapabilities = (
  params: ResolveModelCapabilitiesParams
): ModelCapabilities => {
  const identity = normalizeModelIdentity(
    params.target.provider,
    params.target.model,
    params.target.instanceId
  )
  const contextCandidates: FieldCandidate[] = []
  const outputCandidates: FieldCandidate[] = []

  const addCandidate = (
    target: FieldCandidate[],
    value: number | null,
    source: CapabilitySource,
    confidence: Confidence,
    specificity: CapabilitySpecificity,
    order: number
  ): void => {
    if (value === null) return
    target.push({ value, source, confidence, specificity, order })
  }

  const override = params.override
  if (override) {
    addCandidate(
      contextCandidates,
      toNumericValue(override.contextWindow),
      "manual-override",
      "high",
      "exact",
      0
    )
    addCandidate(
      outputCandidates,
      toNumericValue(override.maxOutputTokens),
      "manual-override",
      "high",
      "exact",
      0
    )
  }

  params.claims?.forEach((claim, index) => {
    if (matchCuratedEntry(identity.normalizedModel, claim.model) === null) {
      return
    }
    addCandidate(
      contextCandidates,
      toNumericValue(claim.contextWindow),
      claim.source,
      claim.confidence,
      claim.specificity,
      index
    )
    addCandidate(
      outputCandidates,
      toNumericValue(claim.maxOutputTokens),
      claim.source,
      claim.confidence,
      claim.specificity,
      index
    )
  })

  params.curatedTable?.forEach((entry, index) => {
    const specificity = matchCuratedEntry(identity.normalizedModel, entry.model)
    if (specificity === null) return
    addCandidate(
      contextCandidates,
      toNumericValue(entry.contextWindow),
      "curated-table",
      "medium",
      specificity,
      index
    )
    addCandidate(
      outputCandidates,
      toNumericValue(entry.maxOutputTokens),
      "curated-table",
      "medium",
      specificity,
      index
    )
  })

  const heuristic = params.heuristic
  if (heuristic) {
    addCandidate(
      contextCandidates,
      toNumericValue(heuristic.contextWindow),
      "heuristic",
      "low",
      "family",
      0
    )
    addCandidate(
      outputCandidates,
      toNumericValue(heuristic.maxOutputTokens),
      "heuristic",
      "low",
      "family",
      0
    )
  }

  const defaults = params.defaults
  if (defaults) {
    addCandidate(
      contextCandidates,
      toNumericValue(defaults.contextWindow),
      "default",
      "low",
      "alias",
      0
    )
    addCandidate(
      outputCandidates,
      toNumericValue(defaults.maxOutputTokens),
      "default",
      "low",
      "alias",
      0
    )
  }

  const context = pickCandidate(contextCandidates)
  const output = pickCandidate(outputCandidates)

  return {
    identity,
    contextWindow: context.value,
    contextWindowSource: context.source,
    contextWindowConfidence: context.confidence,
    maxOutputTokens: output.value,
    maxOutputTokensSource: output.source,
    maxOutputTokensConfidence: output.confidence,
    confidence: context.confidence,
    warnings: [],
  }
}

export const computeWorkingWindow = (
  params: ComputeWorkingWindowParams
): WorkingWindow => {
  if (params.contextWindow === null) {
    return {
      status: "unknown",
      contextWindow: null,
      outputReserve: null,
      safetyMargin: null,
      workingWindow: null,
      warnings: [],
    }
  }

  const contextWindow = params.contextWindow
  const modelMaxOutputTokens = toNumericValue(params.modelMaxOutputTokens)
  const warnings: CapabilityWarningCode[] = []
  const clamped =
    modelMaxOutputTokens !== null &&
    params.requestedMaxTokens > modelMaxOutputTokens
  const outputReserve = clamped
    ? modelMaxOutputTokens
    : params.requestedMaxTokens
  if (clamped) warnings.push("OUTPUT_RESERVE_CLAMPED")

  const safetyMargin = Math.max(
    SAFETY_MARGIN_FLOOR,
    Math.floor((contextWindow * SAFETY_MARGIN_NUM) / SAFETY_MARGIN_DEN)
  )
  const workingWindow = contextWindow - outputReserve - safetyMargin

  if (workingWindow <= 0) {
    warnings.push("WORKING_WINDOW_NEGATIVE", "OUTPUT_RESERVE_TOO_LARGE")
    return {
      status: "infeasible",
      contextWindow,
      outputReserve,
      safetyMargin,
      workingWindow: 0,
      warnings,
    }
  }

  const status: WorkingWindowStatus =
    workingWindow < MIN_WORKING_WINDOW ? "degraded" : "ok"

  return {
    status,
    contextWindow,
    outputReserve,
    safetyMargin,
    workingWindow,
    warnings,
  }
}
