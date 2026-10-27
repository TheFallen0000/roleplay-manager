import { describe, it, expect, vi } from "vitest"

import { ListProviderModelsUseCase } from "./list-provider-models.use-case"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderPort, ProviderRegistry } from "../../../domain/ports/provider.port"
import type {
  ProviderInstanceRecord,
  ProviderInstanceRepository,
} from "../../../domain/ports/provider-instance.repository"

const buildSilentLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
})

const buildEmptyRepo = (): ProviderInstanceRepository => ({
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
})

const buildAdapter = (): ProviderPort => ({
  validateConnection: vi.fn(),
  listModels: vi.fn(),
  async *generateStreaming(_context?: any, _options?: any): AsyncIterable<any> {},
})

const makeInstance = (
  overrides?: Partial<ProviderInstanceRecord>,
): ProviderInstanceRecord => ({
  id: "inst-1",
  kind: "openai-compatible",
  name: "LM Studio",
  url: "http://127.0.0.1:1234/v1",
  hasApiKey: false,
  apiKey: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
})

describe("ListProviderModelsUseCase", () => {
  it("devuelve la lista de modelos del adaptador (sin providerInstanceId)", async () => {
    const adapter = buildAdapter()
    adapter.listModels = vi.fn(async () => ({
      models: [{ id: "llama3:latest" }, { id: "qwen2:7b" }],
      manualEntryRequired: false,
    }))
    const registry: ProviderRegistry = {
      listRegistered: () => ["ollama"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(async () => adapter),
    }
    const useCase = new ListProviderModelsUseCase(registry, buildEmptyRepo(), buildSilentLogger())

    const result = await useCase.execute("ollama")

    expect(result).toEqual({
      id: "ollama",
      models: [
        { id: "llama3:latest" },
        { id: "qwen2:7b" },
      ],
      manualEntryRequired: false,
    })
  })

  it("devuelve manualEntryRequired=true si el proveedor no esta configurado", async () => {
    const registry: ProviderRegistry = {
      listRegistered: () => ["openai-compatible"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(async () => null),
    }
    const useCase = new ListProviderModelsUseCase(registry, buildEmptyRepo(), buildSilentLogger())

    const result = await useCase.execute("openai-compatible")

    expect(result).toEqual({
      id: "openai-compatible",
      models: [],
      manualEntryRequired: true,
    })
  })

  it("propaga error si el adaptador falla", async () => {
    const adapter = buildAdapter()
    adapter.listModels = vi.fn(async () => {
      throw new Error("network down")
    })
    const registry: ProviderRegistry = {
      listRegistered: () => ["ollama"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(async () => adapter),
    }
    const useCase = new ListProviderModelsUseCase(registry, buildEmptyRepo(), buildSilentLogger())

    await expect(useCase.execute("ollama")).rejects.toThrow(
      "Could not list models for ollama",
    )
  })

  it("usa createAdapter si se pasa providerInstanceId valido", async () => {
    const adapter = buildAdapter()
    adapter.listModels = vi.fn(async () => ({
      models: [{ id: "qwen2.5:7b" }, { id: "llama3.2:3b" }],
      manualEntryRequired: false,
    }))
    const repo = buildEmptyRepo()
    repo.findById = vi.fn(async (id) => {
      if (id === "inst-1") return makeInstance()
      return null
    })
    const registry: ProviderRegistry = {
      listRegistered: () => ["openai-compatible"],
      createAdapter: vi.fn(() => adapter),
      getAdapter: vi.fn(),
    }
    const useCase = new ListProviderModelsUseCase(registry, repo, buildSilentLogger())

    const result = await useCase.execute("openai-compatible", "inst-1")

    expect(registry.createAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inst-1" }),
    )
    expect(registry.getAdapter).not.toHaveBeenCalled()
    expect(result).toEqual({
      id: "openai-compatible",
      models: [
        { id: "qwen2.5:7b" },
        { id: "llama3.2:3b" },
      ],
      manualEntryRequired: false,
    })
  })

  it("lanza PROVIDER_INSTANCE_NOT_FOUND si providerInstanceId no existe", async () => {
    const repo = buildEmptyRepo()
    repo.findById = vi.fn(async () => null)
    const registry: ProviderRegistry = {
      listRegistered: () => ["openai-compatible"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(),
    }
    const useCase = new ListProviderModelsUseCase(registry, repo, buildSilentLogger())

    await expect(useCase.execute("openai-compatible", "nonexistent")).rejects.toThrow(
      "Provider instance 'nonexistent' not found.",
    )
  })
})