import { describe, expect, it, vi } from "vitest"

import type {
  CapabilityClaim,
  CuratedModelEntry,
} from "@workspace/shared/types/model-capabilities"

import type { Logger } from "../../../domain/ports/logger.port"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../../../domain/ports/provider.port"
import type {
  ProviderInstanceRecord,
  ProviderInstanceRepository,
} from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { GetModelCapabilitiesUseCase } from "./get-model-capabilities.use-case"
import {
  buildCapabilitiesCacheKey,
  ModelCapabilitiesCache,
} from "../../services/model-capabilities-cache.service"

type AdapterWithCapabilities = ProviderPort & {
  resolveCapabilities: (model: string) => Promise<CapabilityClaim[]>
}

const makeLogger = (): Logger => {
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(function (this: Logger) {
      return this
    }),
  }
  return logger
}

const makeAdapter = (
  resolveCapabilities: (model: string) => Promise<CapabilityClaim[]>
): AdapterWithCapabilities => ({
  validateConnection: vi.fn(),
  listModels: vi.fn(),
  resolveCapabilities: vi.fn(resolveCapabilities),
  async *generateStreaming(): AsyncIterable<never> {},
})

const makeRegistry = (adapter: ProviderPort | null): ProviderRegistry => ({
  listRegistered: () => ["ollama", "openai-compatible"],
  getAdapter: vi.fn(async () => adapter),
  createAdapter: vi.fn(() => {
    if (!adapter) throw new Error("No adapter configured")
    return adapter
  }),
})

const makeRepo = (
  instance: ProviderInstanceRecord | null = null
): ProviderInstanceRepository => ({
  list: vi.fn(async () => []),
  findById: vi.fn(async () => instance),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
})

const makeSettings = (
  values: Record<string, string> = {}
): SettingsRepository => ({
  get: vi.fn(async (key: string) => values[key] ?? null),
  getMany: vi.fn(async (keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, values[key] ?? null]))
  ),
  set: vi.fn(async () => {}),
  setMany: vi.fn(async () => {}),
})

const makeInstance = (
  overrides: Partial<ProviderInstanceRecord> = {}
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

const runtimeClaim: CapabilityClaim = {
  source: "runtime-introspection",
  confidence: "high",
  model: "gpt-4o-mini",
  specificity: "exact",
  contextWindow: 4_096,
  maxOutputTokens: 4_096,
}

interface CapabilityGuess {
  contextWindow?: number
  maxOutputTokens?: number
}

interface UseCaseOptions {
  adapter: ProviderPort | null
  settings?: Record<string, string>
  cache?: ModelCapabilitiesCache
  curatedTable?: CuratedModelEntry[]
  heuristicForModel?: (normalizedModel: string) => CapabilityGuess | null
  defaults?: CapabilityGuess
  repo?: ProviderInstanceRepository
}

const buildUseCase = (options: UseCaseOptions) => {
  const logger = makeLogger()
  const cache = options.cache ?? new ModelCapabilitiesCache({ now: () => 0 })
  const registry = makeRegistry(options.adapter)

  const useCase = new GetModelCapabilitiesUseCase({
    registry,
    providerInstanceRepository: options.repo ?? makeRepo(),
    settings: makeSettings(options.settings),
    cache,
    curatedTable: options.curatedTable ?? [],
    heuristicForModel: options.heuristicForModel,
    defaults: options.defaults,
    logger,
  })

  return { useCase, logger, registry, cache }
}

describe("GetModelCapabilitiesUseCase", () => {
  it("layers conversation over model and app overrides", async () => {
    const adapter = makeAdapter(async () => [runtimeClaim])
    const { useCase } = buildUseCase({
      adapter,
      settings: {
        "model_capabilities.override.default": JSON.stringify({
          contextWindow: 8_192,
          maxOutputTokens: null,
        }),
        "model_capabilities.override.model.openai-compatible:gpt-4o-mini":
          JSON.stringify({ contextWindow: 16_384, maxOutputTokens: null }),
      },
    })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      conversationOverride: { contextWindow: 32_768, maxTokens: 2_048 },
    })

    expect(result.capabilities.contextWindow).toBe(32_768)
    expect(result.capabilities.contextWindowSource).toBe("manual-override")
    expect(result.capabilities.contextWindowConfidence).toBe("high")
    expect(result.workingWindow).toEqual({
      status: "ok",
      contextWindow: 32_768,
      outputReserve: 2_048,
      safetyMargin: 1_638,
      workingWindow: 29_082,
      warnings: [],
    })
  })

  it("layers model over app overrides and the resolver", async () => {
    const adapter = makeAdapter(async () => [runtimeClaim])
    const { useCase } = buildUseCase({
      adapter,
      settings: {
        "model_capabilities.override.default": JSON.stringify({
          contextWindow: 8_192,
          maxOutputTokens: null,
        }),
        "model_capabilities.override.model.openai-compatible:gpt-4o-mini":
          JSON.stringify({ contextWindow: 16_384, maxOutputTokens: null }),
      },
    })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
    })

    expect(result.capabilities.contextWindow).toBe(16_384)
    expect(result.capabilities.contextWindowSource).toBe("manual-override")
  })

  it("lets the app override beat the runtime probe when no narrower override exists", async () => {
    const adapter = makeAdapter(async () => [runtimeClaim])
    const { useCase } = buildUseCase({
      adapter,
      settings: {
        "model_capabilities.override.default": JSON.stringify({
          contextWindow: 8_192,
          maxOutputTokens: null,
        }),
      },
    })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
    })

    expect(result.capabilities.contextWindow).toBe(8_192)
    expect(result.capabilities.contextWindowSource).toBe("manual-override")
    expect(result.workingWindow).toEqual({
      status: "ok",
      contextWindow: 8_192,
      outputReserve: 2_048,
      safetyMargin: 409,
      workingWindow: 5_735,
      warnings: [],
    })
  })

  it("falls back to the curated table with a PROBE_FAILED warning when probing throws", async () => {
    const adapter = makeAdapter(async () => {
      throw new Error("probe failed")
    })
    const { useCase, logger } = buildUseCase({
      adapter,
      curatedTable: [
        {
          model: "gpt-4o-mini",
          contextWindow: 128_000,
          maxOutputTokens: 16_384,
        },
      ],
    })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
    })

    expect(result.capabilities.contextWindow).toBe(128_000)
    expect(result.capabilities.contextWindowSource).toBe("curated-table")
    expect(result.capabilities.contextWindowConfidence).toBe("medium")
    expect(result.capabilities.maxOutputTokens).toBe(16_384)
    expect(result.capabilities.maxOutputTokensSource).toBe("curated-table")
    expect(result.capabilities.warnings).toContain("PROBE_FAILED")
    expect(logger.warn).toHaveBeenCalled()
  })

  it("serves a cached claim without probing again", async () => {
    let now = 0
    const cache = new ModelCapabilitiesCache({ ttlMs: 900_000, now: () => now })
    const probe = vi.fn(async () => [runtimeClaim])
    const adapter = makeAdapter(probe)
    const { useCase } = buildUseCase({ adapter, cache })

    const first = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
    })
    now = 1_000
    const second = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
    })

    expect(probe).toHaveBeenCalledTimes(1)
    expect(adapter.resolveCapabilities).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
    expect(second.capabilities.contextWindow).toBe(4_096)
  })

  it("serves an expired claim with a STALE_CACHE warning when the re-probe fails", async () => {
    let now = 0
    const cache = new ModelCapabilitiesCache({ ttlMs: 1_000, now: () => now })
    const staleClaim: CapabilityClaim = {
      source: "runtime-introspection",
      confidence: "high",
      model: "gpt-4o-mini",
      specificity: "exact",
      contextWindow: 32_768,
      maxOutputTokens: null,
    }
    cache.set(
      buildCapabilitiesCacheKey("openai-compatible", null, "gpt-4o-mini"),
      staleClaim
    )

    const probe = vi.fn(async () => {
      throw new Error("probe failed")
    })
    const adapter = makeAdapter(probe)
    const { useCase } = buildUseCase({ adapter, cache })

    now = 1_001

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      refresh: false,
    })

    expect(probe).toHaveBeenCalledTimes(1)
    expect(result.capabilities.contextWindow).toBe(32_768)
    expect(result.capabilities.contextWindowSource).toBe(
      "runtime-introspection"
    )
    expect(result.capabilities.warnings).toContain("STALE_CACHE")
    expect(result.workingWindow.status).toBe("ok")
  })

  it("ignores curated, heuristic and default sources in probe-only mode", async () => {
    const adapter = makeAdapter(async () => [])
    const { useCase } = buildUseCase({
      adapter,
      curatedTable: [
        {
          model: "gpt-4o-mini",
          contextWindow: 128_000,
          maxOutputTokens: 16_384,
        },
      ],
      heuristicForModel: () => ({ contextWindow: 32_768 }),
      defaults: { contextWindow: 8_192, maxOutputTokens: 4_096 },
    })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      probeOnly: true,
    })

    expect(result.capabilities.contextWindow).toBeNull()
    expect(result.capabilities.contextWindowSource).toBeNull()
    expect(result.workingWindow.status).toBe("unknown")
  })

  it("does not serve a stale claim in probe-only mode", async () => {
    let now = 0
    const cache = new ModelCapabilitiesCache({ ttlMs: 1_000, now: () => now })
    const staleClaim: CapabilityClaim = {
      source: "runtime-introspection",
      confidence: "high",
      model: "gpt-4o-mini",
      specificity: "exact",
      contextWindow: 32_768,
      maxOutputTokens: null,
    }
    cache.set(
      buildCapabilitiesCacheKey("openai-compatible", null, "gpt-4o-mini"),
      staleClaim
    )

    const probe = vi.fn(async () => {
      throw new Error("probe failed")
    })
    const adapter = makeAdapter(probe)
    const { useCase } = buildUseCase({ adapter, cache })

    now = 1_001

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      probeOnly: true,
    })

    expect(probe).toHaveBeenCalledTimes(1)
    expect(result.capabilities.contextWindow).toBeNull()
    expect(result.capabilities.contextWindowSource).toBeNull()
    expect(result.capabilities.warnings).toContain("PROBE_FAILED")
    expect(result.capabilities.warnings).not.toContain("STALE_CACHE")
    expect(result.workingWindow.status).toBe("unknown")
  })

  it("clears a cached claim when a refreshed probe returns no claims", async () => {
    const cache = new ModelCapabilitiesCache({ now: () => 0 })
    const key = buildCapabilitiesCacheKey(
      "openai-compatible",
      null,
      "gpt-4o-mini"
    )
    cache.set(key, runtimeClaim)

    const adapter = makeAdapter(async () => [])
    const { useCase } = buildUseCase({ adapter, cache })

    await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      refresh: true,
    })

    expect(cache.get(key)).toBeNull()
    expect(cache.getStale(key)).toBeNull()
  })

  it("stores only capability fields, never the instance URL or API key", async () => {
    const cache = new ModelCapabilitiesCache({ now: () => 0 })
    const setSpy = vi.spyOn(cache, "set")
    const instance = makeInstance({
      apiKey: "sk-secret",
      hasApiKey: true,
      url: "http://secret.example/v1",
    })
    const adapter = makeAdapter(async () => [runtimeClaim])
    const { useCase, registry } = buildUseCase({
      adapter,
      cache,
      repo: makeRepo(instance),
    })

    await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      providerInstanceId: "inst-1",
    })

    expect(registry.createAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inst-1" })
    )
    expect(setSpy).toHaveBeenCalledTimes(1)

    const [key, storedClaim] = setSpy.mock.calls[0]

    expect(key).toBe(
      buildCapabilitiesCacheKey("openai-compatible", "inst-1", "gpt-4o-mini")
    )
    expect(key).not.toMatch(/sk-secret|secret\.example/)
    expect(JSON.stringify(storedClaim)).not.toMatch(
      /sk-secret|secret\.example|apiKey|api_key|url/i
    )
    expect(Object.keys(storedClaim).sort()).toEqual([
      "confidence",
      "contextWindow",
      "maxOutputTokens",
      "model",
      "source",
      "specificity",
    ])
  })

  it("keeps the legacy {id, model, contextWindow} shape available from the result", async () => {
    const adapter = makeAdapter(async () => [runtimeClaim])
    const { useCase } = buildUseCase({ adapter })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      conversationOverride: { contextWindow: 8_192, maxTokens: 2_048 },
    })

    expect({
      id: result.id,
      model: result.model,
      contextWindow: result.capabilities.contextWindow,
    }).toEqual({
      id: "openai-compatible",
      model: "gpt-4o-mini",
      contextWindow: 8_192,
    })
    expect(result.capabilities.contextWindowSource).toBe("manual-override")
  })

  it("returns an unknown window when the adapter has no claim and no fallback exists", async () => {
    const adapter = makeAdapter(async () => [])
    const { useCase } = buildUseCase({ adapter })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
    })

    expect(result.capabilities.contextWindow).toBeNull()
    expect(result.capabilities.contextWindowSource).toBeNull()
    expect(result.workingWindow).toEqual({
      status: "unknown",
      contextWindow: null,
      outputReserve: null,
      safetyMargin: null,
      workingWindow: null,
      warnings: [],
    })
  })

  it("returns an unknown window when the provider is not configured", async () => {
    const { useCase } = buildUseCase({ adapter: null })

    const result = await useCase.execute({
      id: "openai-compatible",
      model: "gpt-4o-mini",
    })

    expect(result.capabilities.contextWindow).toBeNull()
    expect(result.workingWindow.status).toBe("unknown")
  })

  it("fails when the requested provider instance does not exist", async () => {
    const adapter = makeAdapter(async () => [runtimeClaim])
    const { useCase } = buildUseCase({
      adapter,
      repo: makeRepo(null),
    })

    await expect(
      useCase.execute({
        id: "openai-compatible",
        model: "gpt-4o-mini",
        providerInstanceId: "missing",
      })
    ).rejects.toThrow("Provider instance 'missing' not found.")
  })
})
