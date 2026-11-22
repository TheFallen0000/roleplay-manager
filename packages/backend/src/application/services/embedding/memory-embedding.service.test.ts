import { describe, expect, it, vi } from "vitest"

import type {
  ProviderInstanceRecord,
  ProviderInstanceRepository,
} from "../../../domain/ports/provider-instance.repository"
import type { EmbeddingRepository } from "../../../domain/ports/embedding.repository"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../../../domain/ports/provider.port"
import { Memory } from "../../../domain/entities/memory.entity"
import {
  DETERMINISTIC_EMBEDDING_MODEL,
  createDeterministicEmbeddingProvider,
} from "../../../test-utils/deterministic-embedding"
import { MemoryEmbeddingService } from "./memory-embedding.service"

const now = new Date("2026-11-21T12:00:00.000Z")

const mkMemory = (
  overrides: {
    title?: string
    description?: string
    actor?: string
  } = {},
): Memory =>
  Memory.create({
    id: "mem-1",
    conversationId: "conv-1",
    actor: overrides.actor ?? "Nadie",
    title: overrides.title ?? "El dragón escupe fuego",
    description: overrides.description ?? "En el bosque.",
    priority: 5,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  })

const buildRepository = (): EmbeddingRepository => ({
  upsert: vi.fn(async () => {}),
  findByMemoryIds: vi.fn(async () => []),
  deleteByMemoryId: vi.fn(async () => {}),
  deleteByMemoryIds: vi.fn(async () => {}),
  listMissingForConversation: vi.fn(async () => []),
  countStatus: vi.fn(async () => ({ indexed: 0, missing: 0 })),
})

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
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
})

const buildInstanceRepository = (
  instances: Record<string, ProviderInstanceRecord> = {},
): ProviderInstanceRepository => ({
  list: vi.fn(async () => Object.values(instances)),
  findById: vi.fn(async (id) => instances[id] ?? null),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(async () => {}),
})

const buildRegistry = (adapter: ProviderPort | null): ProviderRegistry => ({
  listRegistered: () => ["ollama", "openai-compatible"],
  getAdapter: vi.fn(async () => adapter),
  createAdapter: vi.fn(() => adapter as ProviderPort),
})

const config = {
  provider: "ollama" as const,
  providerInstanceId: null,
  model: DETERMINISTIC_EMBEDDING_MODEL,
  dimension: 8,
}

const buildService = (
  adapter: ProviderPort | null,
  repository = buildRepository(),
  options: {
    registry?: ProviderRegistry
    instanceRepository?: ProviderInstanceRepository
  } = {},
) =>
  new MemoryEmbeddingService({
    repository,
    registry: options.registry ?? buildRegistry(adapter),
    providerInstanceRepository:
      options.instanceRepository ?? buildInstanceRepository(),
  })

describe("MemoryEmbeddingService", () => {
  it("persists an L2-normalized vector with the active provider/model/dimension", async () => {
    const repository = buildRepository()
    const adapter: ProviderPort = {
      validateConnection: async () => "available",
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      async *generateStreaming() {},
      embed: vi.fn(async () => ({
        vectors: [[3, 4]],
        model: "nomic-embed-text",
        dimension: 2,
      })),
    }
    const service = buildService(adapter, repository)
    const memory = mkMemory()

    const record = await service.embedMemory({
      memory,
      config: { ...config, dimension: 2 },
    })

    expect(record).not.toBeNull()
    expect(repository.upsert).toHaveBeenCalledTimes(1)
    const persisted = vi.mocked(repository.upsert).mock.calls[0]![0]
    expect(persisted).toMatchObject({
      memoryId: "mem-1",
      provider: "ollama",
      model: "nomic-embed-text",
      dimension: 2,
      textHash: service.textHash(memory),
    })
    expect(persisted.vector).toBeInstanceOf(Float32Array)
    expect(persisted.vector[0]).toBeCloseTo(0.6, 6)
    expect(persisted.vector[1]).toBeCloseTo(0.8, 6)
  })

  it("persists the provider dimension when the active dimension is not known yet", async () => {
    const repository = buildRepository()
    const adapter: ProviderPort = {
      validateConnection: async () => "available",
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      async *generateStreaming() {},
      embed: vi.fn(async () => ({
        vectors: [[3, 4]],
        model: "nomic-embed-text",
        dimension: 2,
      })),
    }
    const service = buildService(adapter, repository)

    const record = await service.embedMemory({
      memory: mkMemory(),
      config: { ...config, dimension: null },
    })

    expect(record).not.toBeNull()
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ dimension: 2 }),
    )
  })

  it("hashes title + description and ignores the actor", () => {
    const service = buildService(createDeterministicEmbeddingProvider())
    const base = mkMemory({ actor: "Nadie" })
    const otherActor = mkMemory({ actor: "Lyra" })
    const otherTitle = mkMemory({ title: "El wyrm exhala llamas" })
    const otherDescription = mkMemory({ description: "En la arboleda." })

    expect(service.textHash(base)).toBe(service.textHash(base))
    expect(service.textHash(base)).toBe(service.textHash(otherActor))
    expect(service.textHash(base)).not.toBe(service.textHash(otherTitle))
    expect(service.textHash(base)).not.toBe(service.textHash(otherDescription))
  })

  it("returns null without persisting when the provider has no embed method", async () => {
    const repository = buildRepository()
    const service = buildService(
      createDeterministicEmbeddingProvider({ missingEmbed: true }),
      repository,
    )

    await expect(
      service.embedMemory({ memory: mkMemory(), config }),
    ).resolves.toBeNull()
    expect(repository.upsert).not.toHaveBeenCalled()
  })

  it("swallows provider failures and leaves the memory without a vector", async () => {
    const repository = buildRepository()
    const service = buildService(
      createDeterministicEmbeddingProvider({ fail: true }),
      repository,
    )

    await expect(
      service.embedMemory({ memory: mkMemory(), config }),
    ).resolves.toBeNull()
    expect(repository.upsert).not.toHaveBeenCalled()
  })

  it("swallows timeouts reported by the provider", async () => {
    const repository = buildRepository()
    const timeout: ProviderPort = {
      validateConnection: async () => "available",
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      async *generateStreaming() {},
      embed: vi.fn(async () => {
        throw new Error("timed out")
      }),
    }
    const service = buildService(timeout, repository)

    await expect(
      service.embedMemory({ memory: mkMemory(), config }),
    ).resolves.toBeNull()
    expect(repository.upsert).not.toHaveBeenCalled()
  })

  it("rejects a vector whose dimension differs from the active config", async () => {
    const repository = buildRepository()
    const adapter: ProviderPort = {
      validateConnection: async () => "available",
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      async *generateStreaming() {},
      embed: vi.fn(async () => ({
        vectors: [[1, 0]],
        model: "nomic-embed-text",
        dimension: 2,
      })),
    }
    const service = buildService(adapter, repository)

    await expect(
      service.embedMemory({ memory: mkMemory(), config }),
    ).resolves.toBeNull()
    expect(repository.upsert).not.toHaveBeenCalled()
  })

  it("returns a normalized query vector and null when the provider fails", async () => {
    const service = buildService(createDeterministicEmbeddingProvider())
    const vector = await service.embedQuery({
      text: "El wyrm exhala llamas",
      config,
    })

    expect(vector).toBeInstanceOf(Float32Array)
    const norm = Math.sqrt(
      [...(vector ?? [])].reduce((sum, value) => sum + value * value, 0),
    )
    expect(norm).toBeCloseTo(1, 6)

    const failing = buildService(createDeterministicEmbeddingProvider({ fail: true }))
    await expect(
      failing.embedQuery({ text: "El wyrm exhala llamas", config }),
    ).resolves.toBeNull()
  })

  it("refuses an instance whose kind differs from the config provider", async () => {
    const embed = vi.fn(async () => ({
      vectors: [[3, 4]],
      model: DETERMINISTIC_EMBEDDING_MODEL,
      dimension: 2,
    }))
    const adapter: ProviderPort = {
      validateConnection: async () => "available",
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      async *generateStreaming() {},
      embed,
    }
    const createAdapter = vi.fn(() => adapter)
    const registry: ProviderRegistry = {
      listRegistered: () => ["ollama", "openai-compatible"],
      getAdapter: vi.fn(async () => adapter),
      createAdapter,
    }
    const instanceRepository = buildInstanceRepository({
      "inst-1": buildInstance("inst-1", "openai-compatible"),
    })
    const service = buildService(adapter, buildRepository(), {
      registry,
      instanceRepository,
    })
    const mismatchedConfig = {
      ...config,
      provider: "ollama" as const,
      providerInstanceId: "inst-1",
    }

    await expect(
      service.embedTexts({
        texts: ["El dragón escupe fuego"],
        config: mismatchedConfig,
      }),
    ).resolves.toBeNull()
    await expect(
      service.embedMemory({
        memory: mkMemory(),
        config: mismatchedConfig,
      }),
    ).resolves.toBeNull()

    expect(createAdapter).not.toHaveBeenCalled()
    expect(embed).not.toHaveBeenCalled()
  })
})
