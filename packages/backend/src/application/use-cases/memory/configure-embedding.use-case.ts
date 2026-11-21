import type {
  ConfigureEmbeddingInput,
  EmbeddingModelsDTO,
} from "@workspace/shared/types/embedding"
import type { ProviderId } from "@workspace/shared/types/provider"

import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import {
  EMBEDDING_MODEL_KEYS,
  EMBEDDING_SETTINGS_KEYS,
  isProviderId,
} from "../../services/embedding/embedding-config"

/**
 * Persists the global embedding target. Changing provider, instance or the
 * active model invalidates the stored dimension so the next embed can fix it.
 */
export class ConfigureEmbeddingUseCase {
  constructor(private readonly settings: SettingsRepository) {}

  async execute(input: ConfigureEmbeddingInput): Promise<void> {
    const provider: ProviderId | null = isProviderId(input.provider)
      ? input.provider
      : null
    const instanceId = input.providerInstanceId ?? ""
    const models = normalizeModels(input.models)

    const current = await this.settings.getMany([
      EMBEDDING_SETTINGS_KEYS.provider,
      EMBEDDING_SETTINGS_KEYS.providerInstanceId,
      EMBEDDING_SETTINGS_KEYS.modelOllama,
      EMBEDDING_SETTINGS_KEYS.modelOpenAICompatible,
      EMBEDDING_SETTINGS_KEYS.dimension,
    ])

    const changed =
      provider !==
        (isProviderId(current[EMBEDDING_SETTINGS_KEYS.provider])
          ? current[EMBEDDING_SETTINGS_KEYS.provider]
          : null) ||
      instanceId !==
        (current[EMBEDDING_SETTINGS_KEYS.providerInstanceId] ?? "") ||
      (provider !== null &&
        models[activeModelKey(provider)] !==
          (current[EMBEDDING_MODEL_KEYS[provider]] ?? ""))

    const entries: Record<string, string> = {
      [EMBEDDING_SETTINGS_KEYS.provider]: provider ?? "",
      [EMBEDDING_SETTINGS_KEYS.providerInstanceId]: instanceId,
      [EMBEDDING_SETTINGS_KEYS.modelOllama]: models.ollama,
      [EMBEDDING_SETTINGS_KEYS.modelOpenAICompatible]:
        models.openaiCompatible,
    }
    if (provider === null) {
      entries[EMBEDDING_SETTINGS_KEYS.modelOllama] = ""
      entries[EMBEDDING_SETTINGS_KEYS.modelOpenAICompatible] = ""
    }
    if (changed) {
      entries[EMBEDDING_SETTINGS_KEYS.dimension] = ""
    }

    await this.settings.setMany(entries)
  }
}

const normalizeModels = (
  models: EmbeddingModelsDTO | undefined,
): Required<EmbeddingModelsDTO> => ({
  ollama: models?.ollama ?? "",
  openaiCompatible: models?.openaiCompatible ?? "",
})

const activeModelKey = (
  provider: ProviderId,
): keyof Required<EmbeddingModelsDTO> =>
  provider === "ollama" ? "ollama" : "openaiCompatible"
