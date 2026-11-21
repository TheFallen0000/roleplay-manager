import { describe, expect, it, vi } from "vitest"

import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { ConfigureEmbeddingUseCase } from "./configure-embedding.use-case"

const buildSettings = (
  stored: Record<string, string | null> = {},
): SettingsRepository => ({
  get: vi.fn(async (key) => stored[key] ?? null),
  getMany: vi.fn(async () => stored),
  set: vi.fn(async () => {}),
  setMany: vi.fn(async () => {}),
})

const dimensionWasCleared = (settings: SettingsRepository): boolean => {
  const clearedBySet = vi
    .mocked(settings.set)
    .mock.calls.some(
      ([key, value]) => key === "embeddings_dimension" && value === "",
    )
  const clearedBySetMany = vi
    .mocked(settings.setMany)
    .mock.calls.some(
      ([entries]) => entries.embeddings_dimension === "",
    )
  return clearedBySet || clearedBySetMany
}

const dimensionStayed = (settings: SettingsRepository): boolean =>
  !dimensionWasCleared(settings)

describe("ConfigureEmbeddingUseCase", () => {
  it("persists the provider, instance and both model slots under the RFC keys", async () => {
    const settings = buildSettings({
      embeddings_provider: "ollama",
      embeddings_model_ollama: "nomic-embed-text",
      embeddings_dimension: "768",
    })
    const useCase = new ConfigureEmbeddingUseCase(settings)

    await useCase.execute({
      provider: "ollama",
      providerInstanceId: null,
      models: {
        ollama: "mxbai-embed-large",
        openaiCompatible: "text-embedding-3-small",
      },
    })

    expect(settings.setMany).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddings_provider: "ollama",
        embeddings_provider_instance_id: "",
        embeddings_model_ollama: "mxbai-embed-large",
        embeddings_model_openai_compatible: "text-embedding-3-small",
      }),
    )
    expect(dimensionWasCleared(settings)).toBe(true)
  })

  it("disables embeddings by clearing the provider and the active dimension", async () => {
    const settings = buildSettings({
      embeddings_provider: "ollama",
      embeddings_model_ollama: "nomic-embed-text",
      embeddings_dimension: "768",
    })
    const useCase = new ConfigureEmbeddingUseCase(settings)

    await useCase.execute({
      provider: null,
      providerInstanceId: null,
      models: {},
    })

    expect(settings.setMany).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddings_provider: "",
        embeddings_provider_instance_id: "",
        embeddings_model_ollama: "",
        embeddings_model_openai_compatible: "",
      }),
    )
    expect(dimensionWasCleared(settings)).toBe(true)
  })

  it("keeps the active dimension when the configuration does not change", async () => {
    const settings = buildSettings({
      embeddings_provider: "ollama",
      embeddings_provider_instance_id: "",
      embeddings_model_ollama: "nomic-embed-text",
      embeddings_dimension: "768",
    })
    const useCase = new ConfigureEmbeddingUseCase(settings)

    await useCase.execute({
      provider: "ollama",
      providerInstanceId: null,
      models: { ollama: "nomic-embed-text" },
    })

    expect(dimensionStayed(settings)).toBe(true)
  })

  it("clears the dimension when the provider instance changes", async () => {
    const settings = buildSettings({
      embeddings_provider: "openai-compatible",
      embeddings_provider_instance_id: "inst-1",
      embeddings_model_openai_compatible: "text-embedding-3-small",
      embeddings_dimension: "1536",
    })
    const useCase = new ConfigureEmbeddingUseCase(settings)

    await useCase.execute({
      provider: "openai-compatible",
      providerInstanceId: "inst-2",
      models: { openaiCompatible: "text-embedding-3-small" },
    })

    expect(settings.setMany).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddings_provider_instance_id: "inst-2",
      }),
    )
    expect(dimensionWasCleared(settings)).toBe(true)
  })

  it("never returns an API key", async () => {
    const settings = buildSettings({
      embeddings_provider: "openai-compatible",
      embeddings_provider_instance_id: "inst-1",
      provider_openai_compatible_api_key: "sk-secret-value",
      embeddings_dimension: "1536",
    })
    const useCase = new ConfigureEmbeddingUseCase(settings)

    const result = await useCase.execute({
      provider: "openai-compatible",
      providerInstanceId: "inst-1",
      models: { openaiCompatible: "text-embedding-3-small" },
    })

    expect(JSON.stringify(result ?? {})).not.toContain("sk-secret-value")
    expect(settings.setMany).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddings_provider: "openai-compatible",
        embeddings_provider_instance_id: "inst-1",
        embeddings_model_openai_compatible: "text-embedding-3-small",
      }),
    )
  })
})
