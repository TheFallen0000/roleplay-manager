import type {
  EmbeddingConfigDTO,
  EmbeddingIndexStatusDTO,
  EmbeddingModelsDTO,
} from "@workspace/shared/types/embedding"
import type { ProviderId } from "@workspace/shared/types/provider"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { EmbeddingRepository } from "../../../domain/ports/embedding.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import {
  EMBEDDING_MODEL_KEYS,
  EMBEDDING_SETTINGS_KEYS,
  isProviderId,
  parseEmbeddingDimension,
} from "../../services/embedding/embedding-config"

/**
 * Reads the global embedding configuration and aggregates the index status of
 * every conversation. The DTO never carries the provider API key.
 */
export class GetEmbeddingConfigUseCase {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly embeddingRepository: EmbeddingRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async execute(): Promise<EmbeddingConfigDTO> {
    const stored = await this.settings.getMany([
      EMBEDDING_SETTINGS_KEYS.provider,
      EMBEDDING_SETTINGS_KEYS.providerInstanceId,
      EMBEDDING_SETTINGS_KEYS.modelOllama,
      EMBEDDING_SETTINGS_KEYS.modelOpenAICompatible,
      EMBEDDING_SETTINGS_KEYS.dimension,
    ])

    const providerRaw = stored[EMBEDDING_SETTINGS_KEYS.provider]
    const provider: ProviderId | null = isProviderId(providerRaw)
      ? providerRaw
      : null
    const models = readModels(stored)
    const providerInstanceId = normalizeInstance(
      stored[EMBEDDING_SETTINGS_KEYS.providerInstanceId],
    )
    const dimension = parseEmbeddingDimension(
      stored[EMBEDDING_SETTINGS_KEYS.dimension],
    )

    if (!provider) {
      return {
        provider: null,
        providerInstanceId,
        models,
        hasApiKey: false,
        enabled: false,
        dimension,
        status: { indexed: 0, missing: 0 },
      }
    }

    const model = models[
      provider === "ollama" ? "ollama" : "openaiCompatible"
    ]
    const hasApiKey = await this.resolveHasApiKey(
      provider,
      providerInstanceId,
    )

    if (!model) {
      return {
        provider,
        providerInstanceId,
        models,
        hasApiKey,
        enabled: false,
        dimension,
        status: { indexed: 0, missing: 0 },
      }
    }

    const status = await this.aggregateStatus(provider, model, dimension)
    return {
      provider,
      providerInstanceId,
      models,
      hasApiKey,
      enabled: true,
      dimension,
      status,
    }
  }

  private async resolveHasApiKey(
    provider: ProviderId,
    providerInstanceId: string | null,
  ): Promise<boolean> {
    if (providerInstanceId) {
      const instance =
        await this.providerInstanceRepository.findById(providerInstanceId)
      return instance?.hasApiKey ?? false
    }
    if (provider !== "openai-compatible") return false
    const apiKey = await this.settings.get(
      "provider_openai_compatible_api_key",
    )
    return apiKey !== null && apiKey.trim() !== ""
  }

  private async aggregateStatus(
    provider: ProviderId,
    model: string,
    dimension: number | null,
  ): Promise<EmbeddingIndexStatusDTO> {
    const conversations = await this.conversationRepository.list()
    const status: EmbeddingIndexStatusDTO = { indexed: 0, missing: 0 }
    for (const conversation of conversations) {
      const counts = await this.embeddingRepository.countStatus(
        conversation.id,
        { provider, model, dimension },
      )
      status.indexed += counts.indexed
      status.missing += counts.missing
    }
    return status
  }
}

const normalizeInstance = (value: string | null | undefined): string | null =>
  value && value !== "" ? value : null

const readModels = (
  stored: Record<string, string | null>,
): EmbeddingModelsDTO => {
  const models: EmbeddingModelsDTO = {}
  const ollama = stored[EMBEDDING_MODEL_KEYS.ollama]
  const openaiCompatible =
    stored[EMBEDDING_MODEL_KEYS["openai-compatible"]]
  if (ollama) models.ollama = ollama
  if (openaiCompatible) models.openaiCompatible = openaiCompatible
  return models
}
