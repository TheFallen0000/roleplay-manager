import type { ProviderId } from "./provider"

/** Input for the optional `ProviderPort.embed` capability. */
export interface EmbedRequest {
  texts: string[]
  model: string
}

/** Provider response with one vector per input text. */
export interface EmbedResult {
  vectors: number[][]
  model: string
  dimension: number
}

export interface EmbeddingIndexStatusDTO {
  indexed: number
  missing: number
}

/** Per-provider embedding model slots; empty slots are omitted. */
export interface EmbeddingModelsDTO {
  ollama?: string
  openaiCompatible?: string
}

/**
 * Public embedding configuration. It never carries the provider API key: the
 * UI only learns whether one is stored through `hasApiKey`.
 */
export interface EmbeddingConfigDTO {
  provider: ProviderId | null
  providerInstanceId: string | null
  models: EmbeddingModelsDTO
  hasApiKey: boolean
  enabled: boolean
  dimension: number | null
  status: EmbeddingIndexStatusDTO
}

export interface ConfigureEmbeddingInput {
  provider: ProviderId | null
  providerInstanceId: string | null
  models: EmbeddingModelsDTO
}

export interface ReindexEmbeddingsResultDTO {
  /** Memories re-embedded during this run (already valid rows do not count). */
  indexed: number
  /** Memories that still have no valid vector after the run. */
  missing: number
  /** Memories whose batch failed; counted per memory, not per batch. */
  failed: number
}
