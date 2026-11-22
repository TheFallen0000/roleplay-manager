import { describe, expect, it, vi } from "vitest"

import type { MemoryType } from "@workspace/shared/types/memory"

import { Conversation } from "../../domain/entities/conversation.entity"
import { Memory } from "../../domain/entities/memory.entity"
import type {
  EmbeddingRepository,
  MemoryEmbeddingRecord,
} from "../../domain/ports/embedding.repository"
import type { ProviderInstanceRepository } from "../../domain/ports/provider-instance.repository"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../../domain/ports/provider.port"
import {
  DETERMINISTIC_EMBEDDING_DIMENSION,
  DETERMINISTIC_EMBEDDING_MODEL,
  createDeterministicEmbeddingProvider,
  embeddingVectorForText,
} from "../../test-utils/deterministic-embedding"
import { MemoryEmbeddingService } from "./embedding/memory-embedding.service"
import {
  selectMemoriesForPrompt,
  type SelectMemoriesResult,
} from "./memory-retrieval.service"
import { MemoryHybridRetrievalService } from "./memory-hybrid-retrieval.service"

const now = new Date("2026-11-21T12:00:00.000Z")

const config = {
  provider: "ollama" as const,
  providerInstanceId: null,
  model: DETERMINISTIC_EMBEDDING_MODEL,
  dimension: DETERMINISTIC_EMBEDDING_DIMENSION,
}

const mkConversation = (contextWindow: number | null = 8_000): Conversation =>
  Conversation.create({
    id: "conv-1",
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: "llama3",
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 20,
    summaryFrequency: 20,
    contextWindow,
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

const mkMemory = (
  id: string,
  overrides: {
    type?: MemoryType
    priority?: number
    actor?: string
    title?: string
    description?: string
  } = {},
): Memory =>
  Memory.reconstruct({
    id,
    conversationId: "conv-1",
    actor: overrides.actor ?? "Nadie",
    title: overrides.title ?? `Memory ${id}`,
    description: overrides.description ?? ".",
    priority: overrides.priority ?? 5,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
    type: overrides.type,
  })

const providerInstanceRepository: ProviderInstanceRepository = {
  list: vi.fn(async () => []),
  findById: vi.fn(async () => null),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(async () => {}),
}

const buildRegistry = (adapter: ProviderPort | null): ProviderRegistry => ({
  listRegistered: () => ["ollama", "openai-compatible"],
  getAdapter: vi.fn(async () => adapter),
  createAdapter: vi.fn(() => adapter as ProviderPort),
})

const buildHarness = (
  options: {
    adapter?: ProviderPort | null
    rows?: MemoryEmbeddingRecord[]
  } = {},
) => {
  const adapter =
    options.adapter === undefined
      ? createDeterministicEmbeddingProvider()
      : options.adapter
  const rows = options.rows ?? []
  const repository: EmbeddingRepository = {
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
    listMissingForConversation: vi.fn(async () => []),
    countStatus: vi.fn(async () => ({ indexed: rows.length, missing: 0 })),
  }
  const embeddingService = new MemoryEmbeddingService({
    repository,
    registry: buildRegistry(adapter ?? null),
    providerInstanceRepository,
  })
  const hybrid = new MemoryHybridRetrievalService({
    embeddingService,
    embeddingRepository: repository,
  })
  return { hybrid, embeddingService, repository, rows }
}

const embeddingRow = (
  memory: Memory,
  service: MemoryEmbeddingService,
  overrides: Partial<MemoryEmbeddingRecord> = {},
): MemoryEmbeddingRecord => ({
  memoryId: memory.id,
  provider: config.provider,
  model: config.model,
  dimension: config.dimension,
  vector: Float32Array.from(
    embeddingVectorForText(`${memory.title}\n${memory.description}`),
  ),
  textHash: service.textHash(memory),
  createdAt: now,
  updatedAt: now,
  ...overrides,
})

const selectionOf = (result: SelectMemoriesResult, id: string) =>
  result.selection.find((entry) => entry.id === id)

const retrieve = (
  hybrid: MemoryHybridRetrievalService,
  params: {
    memories: Memory[]
    pendingMessage: string
    mainActors?: string[]
    conversation?: Conversation
    embedding?: {
      provider: "ollama"
      providerInstanceId: string | null
      model: string
      dimension: number | null
    } | null
  },
) =>
  hybrid.retrieve({
    conversation: params.conversation ?? mkConversation(),
    memories: params.memories,
    messages: [],
    pendingMessage: params.pendingMessage,
    mainActors: params.mainActors ?? [],
    embedding: params.embedding === undefined ? config : params.embedding,
  })

const select = (params: {
  memories: Memory[]
  pendingMessage: string
  mainActors?: string[]
  conversation?: Conversation
  semanticScores?: Map<string, number>
}) =>
  selectMemoriesForPrompt({
    conversation: params.conversation ?? mkConversation(),
    memories: params.memories,
    messages: [],
    pendingMessage: params.pendingMessage,
    mainActors: params.mainActors ?? [],
    semanticScores: params.semanticScores,
  })

describe("selectMemoriesForPrompt semantic fusion", () => {
  it("includes a memory with no lexical signal as semantic", () => {
    const memory = mkMemory("mem-semantic", {
      title: "El dragón escupe fuego",
    })
    const result = select({
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
      semanticScores: new Map([["mem-semantic", 0.9]]),
    })

    expect(selectionOf(result, "mem-semantic")).toMatchObject({
      included: true,
      reason: "semantic",
    })
    expect(selectionOf(result, "mem-semantic")?.score).toBeGreaterThan(0)
  })

  it("marks a lexical hit that also clears the threshold as hybrid", () => {
    const memory = mkMemory("mem-hybrid", { title: "El bosque oculta" })
    const result = select({
      memories: [memory],
      pendingMessage: "La arboleda y el bosque",
      semanticScores: new Map([["mem-hybrid", 0.7]]),
    })

    expect(selectionOf(result, "mem-hybrid")).toMatchObject({
      included: true,
      reason: "hybrid",
    })
  })

  it("adds SEMANTIC_WEIGHT (2.0) times the semantic score for a fact", () => {
    const memory = mkMemory("mem-score", { title: "El bosque", priority: 5 })
    const baseline = select({
      memories: [memory],
      pendingMessage: "El bosque.",
    })
    const boosted = select({
      memories: [memory],
      pendingMessage: "El bosque.",
      semanticScores: new Map([["mem-score", 0.8]]),
    })

    const expected =
      Math.round(((baseline.selection[0]?.score ?? 0) + 2.0 * 0.8) * 1000) /
      1000
    expect(boosted.selection[0]?.score).toBeCloseTo(expected, 3)
  })

  it("keeps a memory below SEMANTIC_THRESHOLD (0.55) as not-relevant without lexical signal", () => {
    const memory = mkMemory("mem-low", { title: "Un recuerdo lejano" })
    const result = select({
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
      semanticScores: new Map([["mem-low", 0.4]]),
    })

    expect(selectionOf(result, "mem-low")).toMatchObject({
      included: false,
      reason: "not-relevant",
    })
  })

  it("keeps the S136 result intact when semanticScores is absent or empty", () => {
    const memories = [
      mkMemory("mem-a", { title: "El bosque" }),
      mkMemory("mem-b", { title: "Una promesa", type: "thread" }),
    ]

    const without = select({ memories, pendingMessage: "El bosque." })
    const empty = select({
      memories,
      pendingMessage: "El bosque.",
      semanticScores: new Map(),
    })

    expect(empty).toEqual(without)
  })

  it("sorts equal lexical signals by semantic score", () => {
    const memories = [
      mkMemory("mem-low", { title: "Un recuerdo" }),
      mkMemory("mem-high", { title: "Otro recuerdo" }),
    ]
    const result = select({
      memories,
      pendingMessage: "Nada relevante.",
      semanticScores: new Map([
        ["mem-low", 0.6],
        ["mem-high", 0.9],
      ]),
    })

    expect(result.memories.map((memory) => memory.id)).toEqual([
      "mem-high",
      "mem-low",
    ])
  })
})

describe("MemoryHybridRetrievalService", () => {
  it("recovers a pure paraphrase with reason semantic", async () => {
    const harness = buildHarness()
    const memory = mkMemory("mem-paraphrase", {
      title: "El dragón escupe fuego",
      description: ".",
    })
    harness.rows.push(embeddingRow(memory, harness.embeddingService))

    const result = await retrieve(harness.hybrid, {
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
    })

    expect(selectionOf(result, "mem-paraphrase")).toMatchObject({
      included: true,
      reason: "semantic",
    })
    expect(result.memories.map((item) => item.id)).toEqual(["mem-paraphrase"])
  })

  it("combines a keyword hit with a close synonym as hybrid", async () => {
    const harness = buildHarness()
    const memory = mkMemory("mem-hybrid", {
      title: "El bosque",
      description: ".",
    })
    harness.rows.push(embeddingRow(memory, harness.embeddingService))

    const result = await retrieve(harness.hybrid, {
      memories: [memory],
      pendingMessage: "La arboleda y el bosque",
    })

    expect(selectionOf(result, "mem-hybrid")).toMatchObject({
      included: true,
      reason: "hybrid",
    })
  })

  it("does not add a semantic boost to superficially similar but distant text", async () => {
    const harness = buildHarness()
    const suspicious = mkMemory("mem-false-friend", {
      title: "El fuego consume el bosque",
      description: ".",
    })
    const unrelated = mkMemory("mem-unmapped", {
      title: "El dragonalia escupe",
      description: ".",
    })
    harness.rows.push(
      embeddingRow(suspicious, harness.embeddingService),
      embeddingRow(unrelated, harness.embeddingService),
    )

    const result = await retrieve(harness.hybrid, {
      memories: [suspicious, unrelated],
      pendingMessage: "El fuego artificial ilumina la ciudad",
    })

    expect(selectionOf(result, "mem-false-friend")).toMatchObject({
      included: true,
      reason: "keyword",
    })
    expect(selectionOf(result, "mem-unmapped")).toMatchObject({
      included: false,
      reason: "not-relevant",
    })
  })

  it("falls back to the S136 selection when embeddings are disabled", async () => {
    const harness = buildHarness()
    const memories = [
      mkMemory("mem-actor", { actor: "Lyra", title: "Misión" }),
      mkMemory("mem-thread", { type: "thread", title: "Promesa" }),
      mkMemory("mem-noise", { title: "Ruido" }),
    ]

    const hybridResult = await retrieve(harness.hybrid, {
      memories,
      pendingMessage: "Lyra entra en la sala.",
      mainActors: ["Lyra"],
      embedding: null,
    })
    const lexical = select({
      memories,
      pendingMessage: "Lyra entra en la sala.",
      mainActors: ["Lyra"],
    })

    expect(hybridResult).toEqual(lexical)
  })

  it("falls back to the S136 selection when the provider fails", async () => {
    const harness = buildHarness({
      adapter: createDeterministicEmbeddingProvider({ fail: true }),
    })
    const memories = [
      mkMemory("mem-actor", { actor: "Lyra", title: "Misión" }),
      mkMemory("mem-noise", { title: "Ruido" }),
    ]

    const hybridResult = await retrieve(harness.hybrid, {
      memories,
      pendingMessage: "Lyra entra en la sala.",
      mainActors: ["Lyra"],
    })
    const lexical = select({
      memories,
      pendingMessage: "Lyra entra en la sala.",
      mainActors: ["Lyra"],
    })

    expect(hybridResult).toEqual(lexical)
  })

  it.each([
    [
      "a stale text hash",
      (memory: Memory, service: MemoryEmbeddingService) =>
        embeddingRow(memory, service, { textHash: "stale" }),
    ],
    [
      "a different model",
      (memory: Memory, service: MemoryEmbeddingService) =>
        embeddingRow(memory, service, { model: "other-embed" }),
    ],
    [
      "a different provider",
      (memory: Memory, service: MemoryEmbeddingService) =>
        embeddingRow(memory, service, { provider: "openai-compatible" }),
    ],
    [
      "a different dimension",
      (memory: Memory, service: MemoryEmbeddingService) =>
        embeddingRow(memory, service, {
          dimension: 4,
          vector: Float32Array.from(
            embeddingVectorForText(`${memory.title}\n${memory.description}`),
          ).slice(0, 4),
        }),
    ],
  ])("ignores a vector invalidated by %s", async (_label, makeRow) => {
    const harness = buildHarness()
    const memory = mkMemory("mem-invalid", {
      title: "El dragón escupe fuego",
    })
    harness.rows.push(makeRow(memory, harness.embeddingService))

    const hybridResult = await retrieve(harness.hybrid, {
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
    })
    const lexical = select({
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
    })

    expect(hybridResult).toEqual(lexical)
  })

  it("ignores every stored vector when the active dimension is null", async () => {
    const harness = buildHarness()
    const memory = mkMemory("mem-null-dimension", {
      title: "El dragón escupe fuego",
    })
    harness.rows.push(embeddingRow(memory, harness.embeddingService))

    const hybridResult = await retrieve(harness.hybrid, {
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
      embedding: { ...config, dimension: null },
    })
    const lexical = select({
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
    })

    expect(hybridResult).toEqual(lexical)
  })

  it("returns an empty selection for a conversation without memories", async () => {
    const harness = buildHarness()

    const result = await retrieve(harness.hybrid, {
      memories: [],
      pendingMessage: "El wyrm exhala llamas",
    })

    expect(result.selection).toEqual([])
    expect(result.memories).toEqual([])
    expect(result.tokens).toBe(0)
  })

  it("keeps the 512 token fallback budget when the window is unknown", async () => {
    const harness = buildHarness()
    const memory = mkMemory("mem-budget", { title: "El dragón escupe fuego" })
    harness.rows.push(embeddingRow(memory, harness.embeddingService))

    const result = await retrieve(harness.hybrid, {
      memories: [memory],
      pendingMessage: "El wyrm exhala llamas",
      conversation: mkConversation(null),
    })

    expect(result.budget).toBe(512)
  })

  it("keeps the S136 order and budget when more semantic candidates fit than the budget", async () => {
    const harness = buildHarness()
    const memories = Array.from({ length: 40 }, (_, index) =>
      mkMemory(`mem-${String(index).padStart(2, "0")}`, {
        title: "El dragón escupe fuego",
        description: ".",
        priority: 5,
      }),
    )
    harness.rows.push(
      ...memories.map((memory) =>
        embeddingRow(memory, harness.embeddingService),
      ),
    )

    const first = await retrieve(harness.hybrid, {
      memories,
      pendingMessage: "El wyrm exhala llamas",
      conversation: mkConversation(400),
    })
    const second = await retrieve(harness.hybrid, {
      memories,
      pendingMessage: "El wyrm exhala llamas",
      conversation: mkConversation(400),
    })

    expect(first.budget).toBe(256)
    expect(first.tokens).toBeLessThanOrEqual(first.budget)
    expect(first.selection.some((entry) => entry.reason === "budget")).toBe(
      true,
    )
    expect(first.memories.length).toBeLessThan(memories.length)
    expect(second.selection).toEqual(first.selection)
    expect(second.memories.map((memory) => memory.id)).toEqual(
      first.memories.map((memory) => memory.id),
    )
  })
})
