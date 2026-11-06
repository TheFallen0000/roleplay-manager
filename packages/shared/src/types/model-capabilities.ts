import type { ProviderId } from "./provider"

/** Where a capability value came from, ordered by resolution precedence. */
export type CapabilitySource =
  | "manual-override"
  | "runtime-introspection"
  | "provider-api"
  | "curated-table"
  | "heuristic"
  | "default"

export type Confidence = "high" | "medium" | "low"

export type CapabilitySpecificity = "exact" | "family" | "alias"

export interface ModelIdentity {
  provider: string
  instanceId: string | null
  normalizedModel: string
}

export interface CapabilityClaim {
  source: CapabilitySource
  confidence: Confidence
  /** Normalized model this claim targets. */
  model: string
  specificity: CapabilitySpecificity
  contextWindow?: number | null
  maxOutputTokens?: number | null
}

export type CapabilityWarningCode =
  | "PROBE_FAILED"
  | "STALE_CACHE"
  | "OUTPUT_RESERVE_CLAMPED"
  | "OUTPUT_RESERVE_TOO_LARGE"
  | "WORKING_WINDOW_NEGATIVE"

export interface ModelCapabilities {
  identity: ModelIdentity
  contextWindow: number | null
  contextWindowSource: CapabilitySource | null
  contextWindowConfidence: Confidence | null
  maxOutputTokens: number | null
  maxOutputTokensSource: CapabilitySource | null
  maxOutputTokensConfidence: Confidence | null
  /** Mirrors `contextWindowConfidence` because the context window is the primary field. */
  confidence: Confidence | null
  warnings: CapabilityWarningCode[]
}

export type WorkingWindowStatus = "unknown" | "ok" | "degraded" | "infeasible"

export interface WorkingWindow {
  status: WorkingWindowStatus
  contextWindow: number | null
  outputReserve: number | null
  safetyMargin: number | null
  /** Zero when infeasible, null when the context window is unknown. */
  workingWindow: number | null
  warnings: CapabilityWarningCode[]
}

export interface CuratedModelEntry {
  /** Canonical id, for example "gpt-4o-mini". */
  model: string
  /** LiteLLM `max_input_tokens`. */
  contextWindow?: number
  /** LiteLLM `max_output_tokens`. */
  maxOutputTokens?: number
}

/** Full resolution returned by the capabilities endpoint for one model. */
export interface ModelCapabilitiesResult {
  id: ProviderId
  model: string
  capabilities: ModelCapabilities
  workingWindow: WorkingWindow
}
