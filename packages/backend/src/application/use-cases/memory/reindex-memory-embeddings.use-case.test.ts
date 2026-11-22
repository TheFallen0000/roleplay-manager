import { describe, expect, it, vi } from "vitest"

import { Conversation } from "../../../domain/entities/conversation.entity"
import { Memory } from "../../../domain/entities/memory.entity"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type {
  EmbeddingRepository,
  EmbeddingTarget,
  MemoryEmbeddingRecord,
} from "../../../domain/ports/embedding.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import {
  DETERMINISTIC_EMBEDDING_DIMENSION,
  DETERMINISTIC_EMBEDDING_MODEL,
  embeddingVectorForText,
} from "../../../test-utils/deterministic-embedding"
import type { MemoryEmbeddingService } from "../../../application/services/embedding/memory-embedding.service"
import { ReindexMemoryEmbeddingsUseCase } from "./reindex-memory-embeddings.use-case"

const now = new Date("2026-11-21T12:00:00.000Z")

const target: EmbeddingTarget & { provider: string } = {
  provider: "ollama",
  model: DETERMINISTIC_EMBEDDING_MODEL,
  dimension: DETERMINISTIC_EMBEDDING_DIMENSION,
}

const runtimeConfig = {
  providerInstanceId: null,
  ...target,
}

const mkConversation = (id: string): Conversation =>
  Conversation.create({
    id,
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: "llama3",
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 20,
    summaryFrequency: 20,
    contextWindow: 8_000,
    compactionThreshold: 80,
    temperature: 0.7,
    maxTokens: 2_048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    createdAt: now,
    updatedAt: now,
  })

const mkMemory = (conversationId: string, index: number): Memory =>
  Memory.reconstruct({
    id: `${conversationId}-mem-${String(index).padStart(2, "0")}`,
    conversationId,
    actor: "Nadie",
    title: `El dragón escupe fuego ${index}`,
    description: ".",
    priority: 5,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  })

const buildConversationRepository = (
  conversationIds: string[],
): ConversationRepository => ({
  create: vi.fn(async (conversation) => conversation),
  findById: vi.fn(async (id) =>
    conversationIds.includes(id) ? mkConversation(id) : null,
  ),
  list: vi.fn(async () => conversationIds.map(mkConversation)),
  listByCharacterId: vi.fn(async () => []),
  listByCharacterIds: vi.fn(async () => []),
  existsByAssetId: vi.fn(async () => false),
  update: vi.fn(async (conversation) => conversation),
  updateSettings: vi.fn(async (_id, _settings) => mkConversation(conversationIds[0]!)),
  clearProviderInstanceId: vi.fn(async () => {}),
})

const buildMemoryRepository = (
  byConversation: Map<string, Memory[]>,
): MemoryRepository => ({
  findById: vi.fn(async () => null),
  findByConversationId: vi.fn(
    async (conversationId) => byConversation.get(conversationId) ?? [],
  ),
  create: vi.fn(async (memory) => memory),
  update: vi.fn(async (memory) => memory),
  deleteById: vi.fn(async () => {}),
})

const buildFakeHash = (memory: Pick<Memory, "title" | "description">): string =>
  `${memory.title}\n${memory.description}`

const buildEmbeddingService = () => {
  const textHash = vi.fn((memory: Pick<Memory, "title" | "description">) =>
    buildFakeHash(memory),
  )
  const embedTexts = vi.fn(
    async (input: { texts: string[] }) => ({
      vectors: input.texts.map((text) =>
        Float32Array.from(embeddingVectorForText(text)),
      ),
      dimension: DETERMINISTIC_EMBEDDING_DIMENSION,
    }),
  )
  return {
    textHash,
    embedTexts,
    embedQuery: vi.fn(),
    embedMemory: vi.fn(),
  }
}

const buildSettings = (stored: Record<string, string | null> = {}) => {
  const values = { ...stored }
  const settings: SettingsRepository = {
    get: vi.fn(async (key) => values[key] ?? null),
    getMany: vi.fn(async () => values),
    set: vi.fn(async (key, value) => {
      values[key] = value
    }),
    setMany: vi.fn(async (entries) => {
      Object.assign(values, entries)
    }),
  }
  return { settings, values }
}

const matchesTarget = (
  row: MemoryEmbeddingRecord,
  embeddingTarget: EmbeddingTarget,
): boolean =>
  embeddingTarget.dimension !== null &&
  row.provider === embeddingTarget.provider &&
  row.model === embeddingTarget.model &&
  row.dimension === embeddingTarget.dimension

const buildEmbeddingRepository = (
  byConversation: Map<string, Memory[]>,
  rows: MemoryEmbeddingRecord[],
): EmbeddingRepository => ({
  upsert: vi.fn(async (record) => {
    const index = rows.findIndex((row) => row.memoryId === record.memoryId)
    const next: MemoryEmbeddingRecord = {
      ...record,
      createdAt: now,
      updatedAt: now,
    }
    if (index >= 0) rows[index] = next
    else rows.push(next)
  }),
  findByMemoryIds: vi.fn(async (ids) =>
    rows.filter((row) => ids.includes(row.memoryId)),
  ),
  deleteByMemoryId: vi.fn(async () => {}),
  deleteByMemoryIds: vi.fn(async () => {}),
  listMissingForConversation: vi.fn(
    async (conversationId, embeddingTarget) =>
      (byConversation.get(conversationId) ?? [])
        .filter(
          (memory) =>
            !rows.some(
              (row) =>
                row.memoryId === memory.id &&
                matchesTarget(row, embeddingTarget),
            ),
        )
        .map((memory) => memory.id),
  ),
  countStatus: vi.fn(async (conversationId, embeddingTarget) => {
    const memories = byConversation.get(conversationId) ?? []
    if (embeddingTarget.dimension === null) {
      return { indexed: 0, missing: memories.length }
    }
    const indexed = memories.filter((memory) =>
      rows.some(
        (row) =>
          row.memoryId === memory.id && matchesTarget(row, embeddingTarget),
      ),
    ).length
    return { indexed, missing: memories.length - indexed }
  }),
})

const buildUseCase = (params: {
  conversations: Record<string, Memory[]>
  rows?: MemoryEmbeddingRecord[]
  service?: ReturnType<typeof buildEmbeddingService>
  config?: typeof runtimeConfig | null
  storedSettings?: Record<string, string | null>
}) => {
  const conversationIds = Object.keys(params.conversations)
  const byConversation = new Map(Object.entries(params.conversations))
  const rows = params.rows ?? []
  const service = params.service ?? buildEmbeddingService()
  const { settings, values } = buildSettings(params.storedSettings)
  const embeddingRepository = buildEmbeddingRepository(byConversation, rows)
  const useCase = new ReindexMemoryEmbeddingsUseCase({
    conversationRepository: buildConversationRepository(conversationIds),
    memoryRepository: buildMemoryRepository(byConversation),
    embeddingRepository,
    embeddingService: service as unknown as MemoryEmbeddingService,
    settings,
    resolveConfig: vi.fn(async () =>
      "config" in params ? params.config ?? null : runtimeConfig,
    ),
  })
  return { useCase, service, embeddingRepository, settings, values, rows }
}

const validRow = (
  memory: Memory,
  embeddingTarget: EmbeddingTarget = target,
): MemoryEmbeddingRecord => ({
  memoryId: memory.id,
  provider: embeddingTarget.provider,
  model: embeddingTarget.model,
  dimension:
    embeddingTarget.dimension ?? DETERMINISTIC_EMBEDDING_DIMENSION,
  vector: Float32Array.from(
    embeddingVectorForText(`${memory.title}\n${memory.description}`),
  ),
  textHash: buildFakeHash(memory),
  createdAt: now,
  updatedAt: now,
})

describe("ReindexMemoryEmbeddingsUseCase", () => {
  it("reindexes every conversation and writes the dimension after the first correct embed", async () => {
    const conversationId = "conv-1"
    const memories = Array.from({ length: 34 }, (_, index) =>
      mkMemory(conversationId, index),
    )
    const { useCase, service, values, rows } = buildUseCase({
      conversations: { [conversationId]: memories },
      config: { ...runtimeConfig, dimension: null },
      storedSettings: { embeddings_provider: "ollama", embeddings_dimension: null },
    })

    const result = await useCase.execute()

    expect(result).toEqual({ indexed: 34, missing: 0, failed: 0 })
    expect(service.embedTexts).toHaveBeenCalledTimes(3)
    const batchSizes = service.embedTexts.mock.calls.map(
      (call) => call[0].texts.length,
    )
    expect(batchSizes).toEqual([16, 16, 2])
    expect(values.embeddings_dimension).toBe(
      String(DETERMINISTIC_EMBEDDING_DIMENSION),
    )
    expect(rows).toHaveLength(34)
    expect(
      rows.every(
        (row) => row.dimension === DETERMINISTIC_EMBEDDING_DIMENSION,
      ),
    ).toBe(true)
  })

  it("aggregates the result across several conversations", async () => {
    const conv1 = "conv-1"
    const conv2 = "conv-2"
    const { useCase, service, embeddingRepository } = buildUseCase({
      conversations: {
        [conv1]: [mkMemory(conv1, 1), mkMemory(conv1, 2)],
        [conv2]: [mkMemory(conv2, 1), mkMemory(conv2, 2), mkMemory(conv2, 3)],
      },
    })

    const result = await useCase.execute()

    expect(result).toEqual({ indexed: 5, missing: 0, failed: 0 })
    const embeddedTexts = service.embedTexts.mock.calls.flatMap(
      (call) => call[0].texts,
    )
    expect(embeddedTexts).toHaveLength(5)
    expect(embeddingRepository.countStatus).toHaveBeenCalledWith(
      conv1,
      expect.objectContaining({ dimension: DETERMINISTIC_EMBEDDING_DIMENSION }),
    )
    expect(embeddingRepository.countStatus).toHaveBeenCalledWith(
      conv2,
      expect.objectContaining({ dimension: DETERMINISTIC_EMBEDDING_DIMENSION }),
    )
  })

  it("re-embeds only rows whose text hash is stale", async () => {
    const conversationId = "conv-1"
    const memories = [
      mkMemory(conversationId, 1),
      mkMemory(conversationId, 2),
      mkMemory(conversationId, 3),
    ]
    const rows = [
      validRow(memories[0]!),
      { ...validRow(memories[1]!), textHash: "stale" },
      { ...validRow(memories[2]!), textHash: "stale" },
    ]
    const { useCase, service } = buildUseCase({
      conversations: { [conversationId]: memories },
      rows,
    })

    const result = await useCase.execute()

    expect(service.embedTexts).toHaveBeenCalledTimes(1)
    const texts = service.embedTexts.mock.calls[0]![0].texts
    expect(texts).toHaveLength(2)
    expect(texts).toEqual([
      `${memories[1]!.title}\n${memories[1]!.description}`,
      `${memories[2]!.title}\n${memories[2]!.description}`,
    ])
    expect(result).toEqual({ indexed: 2, missing: 0, failed: 0 })
  })

  it("keeps valid rows untouched", async () => {
    const conversationId = "conv-1"
    const memories = [mkMemory(conversationId, 1), mkMemory(conversationId, 2)]
    const rows = memories.map((memory) => validRow(memory))
    const { useCase, service, embeddingRepository } = buildUseCase({
      conversations: { [conversationId]: memories },
      rows,
    })

    const result = await useCase.execute()

    expect(service.embedTexts).not.toHaveBeenCalled()
    expect(embeddingRepository.upsert).not.toHaveBeenCalled()
    expect(result).toEqual({ indexed: 0, missing: 0, failed: 0 })
  })

  it("counts a failed batch per memory and keeps reindexing the rest", async () => {
    const conversationId = "conv-1"
    const memories = Array.from({ length: 34 }, (_, index) =>
      mkMemory(conversationId, index),
    )
    const service = buildEmbeddingService()
    service.embedTexts
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        vectors: memories.slice(16, 32).map((memory) =>
          Float32Array.from(
            embeddingVectorForText(`${memory.title}\n${memory.description}`),
          ),
        ),
        dimension: DETERMINISTIC_EMBEDDING_DIMENSION,
      })
      .mockResolvedValueOnce({
        vectors: memories.slice(32).map((memory) =>
          Float32Array.from(
            embeddingVectorForText(`${memory.title}\n${memory.description}`),
          ),
        ),
        dimension: DETERMINISTIC_EMBEDDING_DIMENSION,
      })
    const { useCase } = buildUseCase({
      conversations: { [conversationId]: memories },
      service,
    })

    const result = await useCase.execute()

    expect(service.embedTexts).toHaveBeenCalledTimes(3)
    expect(result).toEqual({ indexed: 18, missing: 16, failed: 16 })
  })

  it("marks every memory missing when the active dimension is unknown", async () => {
    const conversationId = "conv-1"
    const memories = [mkMemory(conversationId, 1), mkMemory(conversationId, 2)]
    const { useCase, embeddingRepository } = buildUseCase({
      conversations: { [conversationId]: memories },
      config: { ...runtimeConfig, dimension: null },
    })

    await useCase.execute()

    expect(embeddingRepository.listMissingForConversation).toHaveBeenCalledWith(
      conversationId,
      expect.objectContaining({ dimension: null }),
    )
  })

  it("counts a vector whose length differs from the active dimension as failed", async () => {
    const conversationId = "conv-1"
    const memories = [mkMemory(conversationId, 1)]
    const service = buildEmbeddingService()
    service.embedTexts.mockResolvedValueOnce({
      vectors: [Float32Array.from([1, 0, 0])],
      dimension: 3,
    })
    const { useCase, embeddingRepository } = buildUseCase({
      conversations: { [conversationId]: memories },
      service,
    })

    const result = await useCase.execute()

    expect(result).toEqual({ indexed: 0, missing: 1, failed: 1 })
    expect(embeddingRepository.upsert).not.toHaveBeenCalled()
  })

  it("does nothing when embeddings are not configured", async () => {
    const conv1 = "conv-1"
    const conv2 = "conv-2"
    const { useCase, service, embeddingRepository } = buildUseCase({
      conversations: {
        [conv1]: [mkMemory(conv1, 1), mkMemory(conv1, 2)],
        [conv2]: [mkMemory(conv2, 1)],
      },
      config: null,
    })

    const result = await useCase.execute()

    expect(service.embedTexts).not.toHaveBeenCalled()
    expect(embeddingRepository.upsert).not.toHaveBeenCalled()
    expect(result).toEqual({ indexed: 0, missing: 3, failed: 0 })
  })
})
