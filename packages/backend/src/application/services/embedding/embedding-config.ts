import type { ProviderId } from "@workspace/shared/types/provider"

import type { SettingsRepository } from "../../../domain/ports/settings.repository"

export interface EmbeddingRuntimeConfig {
  /** Provider id; validated lazily by the embedding service. */
  provider: string
  providerInstanceId: string | null
  model: string
  dimension: number | null
}

export const EMBEDDING_SETTINGS_KEYS = {
  provider: "embeddings_provider",
  providerInstanceId: "embeddings_provider_instance_id",
  modelOllama: "embeddings_model_ollama",
  modelOpenAICompatible: "embeddings_model_openai_compatible",
  dimension: "embeddings_dimension",
} as const

export const EMBEDDING_MODEL_KEYS: Record<ProviderId, string> = {
  ollama: EMBEDDING_SETTINGS_KEYS.modelOllama,
  "openai-compatible": EMBEDDING_SETTINGS_KEYS.modelOpenAICompatible,
}

export const isProviderId = (value: unknown): value is ProviderId =>
  value === "ollama" || value === "openai-compatible"

export const parseEmbeddingDimension = (
  value: string | null | undefined,
): number | null => {
  if (value === null || value === undefined || value.trim() === "") return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Reads the active embedding target from `settings`. Returns `null` when the
 * feature is disabled or incomplete: in that case retrieval stays lexical and
 * reindexing is a no-op.
 */
export const resolveEmbeddingConfig = async (
  settings: SettingsRepository,
): Promise<EmbeddingRuntimeConfig | null> => {
  const stored = await settings.getMany([
    EMBEDDING_SETTINGS_KEYS.provider,
    EMBEDDING_SETTINGS_KEYS.providerInstanceId,
    EMBEDDING_SETTINGS_KEYS.modelOllama,
    EMBEDDING_SETTINGS_KEYS.modelOpenAICompatible,
    EMBEDDING_SETTINGS_KEYS.dimension,
  ])

  const providerRaw = stored[EMBEDDING_SETTINGS_KEYS.provider]
  if (!isProviderId(providerRaw)) return null

  const model =
    stored[EMBEDDING_MODEL_KEYS[providerRaw]]?.trim() ?? ""
  if (!model) return null

  const instanceRaw = stored[EMBEDDING_SETTINGS_KEYS.providerInstanceId]
  return {
    provider: providerRaw,
    providerInstanceId: instanceRaw && instanceRaw !== "" ? instanceRaw : null,
    model,
    dimension: parseEmbeddingDimension(
      stored[EMBEDDING_SETTINGS_KEYS.dimension],
    ),
  }
}
