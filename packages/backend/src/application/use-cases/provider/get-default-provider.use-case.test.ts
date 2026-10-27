import { describe, it, expect, vi } from "vitest"

import { GetDefaultProviderUseCase } from "./get-default-provider.use-case"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"

const noopInstanceRepo: ProviderInstanceRepository = {
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

describe("GetDefaultProviderUseCase", () => {
  it("devuelve null/models vacio si no hay settings guardadas", async () => {
    const settings: SettingsRepository = {
      get: vi.fn(async () => null),
      getMany: vi.fn(async () => ({
        default_provider: null,
        default_provider_instance_id: null,
        default_model_ollama: null,
        default_model_openai_compatible: null,
      })),
      set: vi.fn(),
      setMany: vi.fn(),
    }
    const useCase = new GetDefaultProviderUseCase(settings, noopInstanceRepo)

    const result = await useCase.execute()

    expect(result).toEqual({ provider: null, providerInstanceId: null, models: {} })
  })

  it("devuelve el provider y model persistidos", async () => {
    const settings: SettingsRepository = {
      get: vi.fn(async () => null),
      getMany: vi.fn(async () => ({
        default_provider: "ollama",
        default_provider_instance_id: null,
        default_model_ollama: "llama3:latest",
        default_model_openai_compatible: null,
      })),
      set: vi.fn(),
      setMany: vi.fn(),
    }
    const useCase = new GetDefaultProviderUseCase(settings, noopInstanceRepo)

    const result = await useCase.execute()

    expect(result).toEqual({
      provider: "ollama",
      providerInstanceId: null,
      models: { ollama: "llama3:latest" },
    })
  })

  it("limpia y retorna null si la instancia por defecto fue eliminada", async () => {
    const settings: SettingsRepository = {
      get: vi.fn(async () => null),
      getMany: vi.fn(async () => ({
        default_provider: "openai-compatible",
        default_provider_instance_id: "inst-1",
        default_model_ollama: null,
        default_model_openai_compatible: "gpt-4",
      })),
      set: vi.fn(),
      setMany: vi.fn(),
    }
    const instanceRepo: ProviderInstanceRepository = {
      ...noopInstanceRepo,
      findById: vi.fn(async () => null),
    }
    const useCase = new GetDefaultProviderUseCase(settings, instanceRepo)

    const result = await useCase.execute()

    expect(result).toEqual({ provider: null, providerInstanceId: null, models: {} })
    expect(settings.setMany).toHaveBeenCalledWith({
      default_provider: "",
      default_provider_instance_id: "",
      default_model_ollama: "",
      default_model_openai_compatible: "",
    })
  })

  it("retorna la config si la instancia existe", async () => {
    const settings: SettingsRepository = {
      get: vi.fn(async () => null),
      getMany: vi.fn(async () => ({
        default_provider: "openai-compatible",
        default_provider_instance_id: "inst-1",
        default_model_ollama: null,
        default_model_openai_compatible: "gpt-4",
      })),
      set: vi.fn(),
      setMany: vi.fn(),
    }
    const instanceRepo: ProviderInstanceRepository = {
      ...noopInstanceRepo,
      findById: vi.fn(async () => ({
        id: "inst-1",
        kind: "openai-compatible" as const,
        name: "My OpenAI",
        url: "https://api.openai.com/v1",
        hasApiKey: true,
        apiKey: "sk-...",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })),
    }
    const useCase = new GetDefaultProviderUseCase(settings, instanceRepo)

    const result = await useCase.execute()

    expect(result).toEqual({
      provider: "openai-compatible",
      providerInstanceId: "inst-1",
      models: { "openai-compatible": "gpt-4" },
    })
    expect(settings.setMany).not.toHaveBeenCalled()
  })
})
