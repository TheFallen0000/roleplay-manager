import { describe, expect, it, vi } from "vitest"

import type { ProviderInstanceRecord, ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { ConfigureEmbeddingUseCase } from "./configure-embedding.use-case"

const now = "2026-11-21T12:00:00.000Z"

const buildInstance = (
  id: string,
  kind: "ollama" | "openai-compatible",
): ProviderInstanceRecord => ({
  id,
  kind,
  name: id,
  url: "http://localhost:1234/v1",
  hasApiKey: false,
  apiKey: null,
  createdAt: now,
  updatedAt: now,
})

const buildSettings = (
  stored: Record<string, string | null> = {},
): SettingsRepository => ({
  get: vi.fn(async (key) => stored[key] ?? null),
  getMany: vi.fn(async () => stored),
  set: vi.fn(async () => {}),
  setMany: vi.fn(async () => {}),
})

const buildInstanceRepository = (
  instances: Record<string, ProviderInstanceRecord> = {
    "inst-1": buildInstance("inst-1", "openai-compatible"),
    "inst-2": buildInstance("inst-2", "openai-compatible"),
    "inst-ollama": buildInstance("inst-ollama", "ollama"),
  },
): ProviderInstanceRepository => ({
  list: vi.fn(async () => Object.values(instances)),
  findById: vi.fn(async (id) => instances[id] ?? null),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(async () => {}),
})

const buildUseCase = (
  settings: SettingsRepository,
  instanceRepository = buildInstanceRepository(),
) => new ConfigureEmbeddingUseCase(settings, instanceRepository)

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
    const useCase = buildUseCase(settings)

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

  it("disables embeddings by clearing the provider, instance and active dimension", async () => {
    const settings = buildSettings({
      embeddings_provider: "ollama",
      embeddings_model_ollama: "nomic-embed-text",
      embeddings_dimension: "768",
    })
    const instanceRepository = buildInstanceRepository()
    const useCase = buildUseCase(settings, instanceRepository)

    await useCase.execute({
      provider: null,
      providerInstanceId: "inst-1",
      models: {},
    })

    expect(instanceRepository.findById).not.toHaveBeenCalled()
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
    const useCase = buildUseCase(settings)

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
    const useCase = buildUseCase(settings)

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

  it("accepts an instance whose kind matches the provider", async () => {
    const settings = buildSettings()
    const instanceRepository = buildInstanceRepository()
    const useCase = buildUseCase(settings, instanceRepository)

    await expect(
      useCase.execute({
        provider: "ollama",
        providerInstanceId: "inst-ollama",
        models: { ollama: "nomic-embed-text" },
      }),
    ).resolves.toBeUndefined()

    expect(instanceRepository.findById).toHaveBeenCalledWith("inst-ollama")
    expect(settings.setMany).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddings_provider: "ollama",
        embeddings_provider_instance_id: "inst-ollama",
      }),
    )
  })

  it("rejects an instance whose kind does not match the provider", async () => {
    const settings = buildSettings()
    const usedInstance = buildInstance("inst-1", "openai-compatible")
    const instanceRepository = buildInstanceRepository({
      "inst-1": usedInstance,
    })
    const useCase = buildUseCase(settings, instanceRepository)

    await expect(
      useCase.execute({
        provider: "ollama",
        providerInstanceId: "inst-1",
        models: { ollama: "nomic-embed-text" },
      }),
    ).rejects.toMatchObject({ code: "INVALID_EMBEDDING_INSTANCE" })

    expect(settings.setMany).not.toHaveBeenCalled()
  })

  it("never returns an API key", async () => {
    const settings = buildSettings({
      embeddings_provider: "openai-compatible",
      embeddings_provider_instance_id: "inst-1",
      provider_openai_compatible_api_key: "sk-secret-value",
      embeddings_dimension: "1536",
    })
    const useCase = buildUseCase(settings)

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
