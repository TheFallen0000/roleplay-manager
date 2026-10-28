import { describe, expect, it, vi } from "vitest"

import { GetProviderModelContextUseCase } from "./get-provider-model-context.use-case"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderPort, ProviderRegistry } from "../../../domain/ports/provider.port"
import type {
  ProviderInstanceRecord,
  ProviderInstanceRepository,
} from "../../../domain/ports/provider-instance.repository"

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
}

const buildRepo = (): ProviderInstanceRepository => ({
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
})

const buildAdapter = (): ProviderPort => ({
  validateConnection: vi.fn(),
  listModels: vi.fn(),
  getModelContextWindow: vi.fn(async () => 32_768),
  async *generateStreaming(): AsyncIterable<never> {},
})

const makeInstance = (): ProviderInstanceRecord => ({
  id: "inst-1",
  kind: "openai-compatible",
  name: "LM Studio",
  url: "http://127.0.0.1:1234/v1",
  hasApiKey: false,
  apiKey: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
})

describe("GetProviderModelContextUseCase", () => {
  it("returns the window reported by the adapter", async () => {
    const adapter = buildAdapter()
    const registry: ProviderRegistry = {
      listRegistered: () => ["ollama"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(async () => adapter),
    }
    const useCase = new GetProviderModelContextUseCase(
      registry,
      buildRepo(),
      logger,
    )

    const result = await useCase.execute("ollama", "llama3")

    expect(result).toEqual({
      id: "ollama",
      model: "llama3",
      contextWindow: 32_768,
    })
  })

  it("returns null when the provider cannot detect the window", async () => {
    const adapter = buildAdapter()
    adapter.getModelContextWindow = undefined
    const registry: ProviderRegistry = {
      listRegistered: () => ["openai-compatible"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(async () => adapter),
    }
    const useCase = new GetProviderModelContextUseCase(
      registry,
      buildRepo(),
      logger,
    )

    const result = await useCase.execute("openai-compatible", "gpt-4o-mini")

    expect(result.contextWindow).toBeNull()
  })

  it("returns null when the provider is not configured", async () => {
    const registry: ProviderRegistry = {
      listRegistered: () => ["openai-compatible"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(async () => null),
    }
    const useCase = new GetProviderModelContextUseCase(
      registry,
      buildRepo(),
      logger,
    )

    const result = await useCase.execute("openai-compatible", "gpt-4o-mini")

    expect(result.contextWindow).toBeNull()
  })

  it("uses the instance adapter when an instance id is provided", async () => {
    const adapter = buildAdapter()
    const repo = buildRepo()
    repo.findById = vi.fn(async () => makeInstance())
    const registry: ProviderRegistry = {
      listRegistered: () => ["openai-compatible"],
      createAdapter: vi.fn(() => adapter),
      getAdapter: vi.fn(),
    }
    const useCase = new GetProviderModelContextUseCase(registry, repo, logger)

    const result = await useCase.execute(
      "openai-compatible",
      "qwen2.5",
      "inst-1",
    )

    expect(registry.createAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inst-1" }),
    )
    expect(result.contextWindow).toBe(32_768)
  })

  it("fails when the instance does not exist", async () => {
    const repo = buildRepo()
    repo.findById = vi.fn(async () => null)
    const registry: ProviderRegistry = {
      listRegistered: () => ["openai-compatible"],
      createAdapter: vi.fn(),
      getAdapter: vi.fn(),
    }
    const useCase = new GetProviderModelContextUseCase(registry, repo, logger)

    await expect(
      useCase.execute("openai-compatible", "qwen2.5", "missing"),
    ).rejects.toThrow("Provider instance 'missing' not found.")
  })
})
