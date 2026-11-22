import { describe, expect, it, vi } from "vitest"

import { MemoryEmbeddingService } from "../src/application/services/embedding/memory-embedding.service"
import { MemoryHybridRetrievalService } from "../src/application/services/memory-hybrid-retrieval.service"
import {
  resolveMemoryBudget,
  selectMemoriesForPrompt,
} from "../src/application/services/memory-retrieval.service"
import type {
  EmbeddingRepository,
  MemoryEmbeddingRecord,
} from "../src/domain/ports/embedding.repository"
import type { ProviderInstanceRepository } from "../src/domain/ports/provider-instance.repository"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../src/domain/ports/provider.port"
import {
  createDeterministicEmbeddingProvider,
  embeddingVectorForText,
} from "../src/test-utils/deterministic-embedding"
import {
  memoryVectorRetrievalFixtures,
  paraphraseVectorFixtures,
  type MemoryVectorRetrievalEvalFixture,
} from "./fixtures/memory-vector-retrieval"

const REASONS = new Set([
  "actor",
  "keyword",
  "priority",
  "thread",
  "budget",
  "decay",
  "not-relevant",
  "semantic",
  "hybrid",
])

const providerInstanceRepository: ProviderInstanceRepository = {
  list: vi.fn(async () => []),
  findById: vi.fn(async () => null),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(async () => {}),
}

const buildAdapter = (fixture: MemoryVectorRetrievalEvalFixture): ProviderPort =>
  createDeterministicEmbeddingProvider({
    fail: fixture.embeddingFailure === true,
  })

const buildHarness = (fixture: MemoryVectorRetrievalEvalFixture) => {
  const adapter = buildAdapter(fixture)
  const registry: ProviderRegistry = {
    listRegistered: () => ["ollama", "openai-compatible"],
    getAdapter: vi.fn(async () => adapter),
    createAdapter: vi.fn(() => adapter),
  }
  const rows: MemoryEmbeddingRecord[] = []
  const repository: EmbeddingRepository = {
    upsert: vi.fn(async (record) => {
      rows.push({ ...record, createdAt: new Date(), updatedAt: new Date() })
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
    registry,
    providerInstanceRepository,
  })
  if (fixture.embedding) {
    for (const memory of fixture.memories) {
      rows.push({
        memoryId: memory.id,
        provider: fixture.embedding.provider,
        model: fixture.embedding.model,
        dimension: fixture.embedding.dimension,
        vector: Float32Array.from(
          embeddingVectorForText(`${memory.title}\n${memory.description}`),
        ),
        textHash: embeddingService.textHash(memory),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }
  const hybrid = new MemoryHybridRetrievalService({
    embeddingService,
    embeddingRepository: repository,
  })
  return { hybrid }
}

const userTimes = (fixture: MemoryVectorRetrievalEvalFixture) =>
  fixture.messages
    .filter((message) => message.role === "user")
    .map((message) => ({ role: "user", createdAt: message.createdAt }))

const mainActors = (fixture: MemoryVectorRetrievalEvalFixture) => [
  fixture.character.name,
  fixture.playerCharacter.name,
]

const lexicalSelection = (fixture: MemoryVectorRetrievalEvalFixture) =>
  selectMemoriesForPrompt({
    conversation: fixture.conversation,
    memories: fixture.memories,
    messages: userTimes(fixture),
    pendingMessage: fixture.pendingMessage.content,
    mainActors: mainActors(fixture),
  })

const hybridSelection = async (fixture: MemoryVectorRetrievalEvalFixture) => {
  const { hybrid } = buildHarness(fixture)
  return hybrid.retrieve({
    conversation: fixture.conversation,
    memories: fixture.memories,
    messages: userTimes(fixture),
    pendingMessage: fixture.pendingMessage.content,
    mainActors: mainActors(fixture),
    embedding: fixture.embedding,
  })
}

const metrics = (
  fixture: MemoryVectorRetrievalEvalFixture,
  includedIds: string[],
) => {
  const included = new Set(includedIds)
  const relevant = new Set(fixture.relevantIds)
  const irrelevant = new Set(fixture.irrelevantIds)
  const hits = [...relevant].filter((id) => included.has(id)).length
  const noise = [...included].filter((id) => irrelevant.has(id)).length

  return {
    recall: relevant.size === 0 ? 1 : hits / relevant.size,
    irrelevantRate: included.size === 0 ? 0 : noise / included.size,
    includedCount: included.size,
    noiseCount: noise,
  }
}

describe("memory vector retrieval eval", () => {
  it.each(
    memoryVectorRetrievalFixtures.map((fixture) => [fixture.name, fixture] as const),
  )("%s: keeps one selection entry per memory with a known reason", async (_name, fixture) => {
    const result = await hybridSelection(fixture)

    expect(result.selection).toHaveLength(fixture.memories.length)
    expect(new Set(result.selection.map((entry) => entry.id))).toEqual(
      new Set(fixture.memories.map((memory) => memory.id)),
    )
    for (const entry of result.selection) {
      expect(REASONS.has(entry.reason), entry.reason).toBe(true)
      expect(typeof entry.score).toBe("number")
    }
    expect(result.selection.filter((entry) => entry.included).length).toBe(
      result.memories.length,
    )
  })

  it.each(
    memoryVectorRetrievalFixtures.map((fixture) => [fixture.name, fixture] as const),
  )("%s: meets recall, precision and budget thresholds", async (name, fixture) => {
    const started = performance.now()
    const result = await hybridSelection(fixture)
    const elapsed = performance.now() - started
    const includedIds = result.memories.map((memory) => memory.id)
    const { recall, irrelevantRate, includedCount, noiseCount } = metrics(
      fixture,
      includedIds,
    )
    const budget = resolveMemoryBudget(fixture.conversation)

    expect(result.tokens).toBeLessThanOrEqual(budget)
    expect(irrelevantRate).toBeLessThanOrEqual(0.2)
    if (!fixture.skipRecall && fixture.relevantIds.length > 0) {
      expect(recall).toBeGreaterThanOrEqual(0.8)
    }

    console.log(
      `[memory-vector-retrieval] ${name}: recall=${recall.toFixed(2)} irrelevant=${irrelevantRate.toFixed(2)} (${noiseCount}/${includedCount}) tokens=${result.tokens}/${budget} included=${includedCount} embedding=${fixture.embedding ? (fixture.embeddingFailure ? "failed" : "on") : "off"} scoring=${elapsed.toFixed(1)}ms`,
    )
  })

  it.each(
    paraphraseVectorFixtures.map((fixture) => [fixture.name, fixture] as const),
  )("%s: lifts the lexical baseline recall", async (_name, fixture) => {
    const baseline = lexicalSelection(fixture)
    const baselineMetrics = metrics(
      fixture,
      baseline.memories.map((memory) => memory.id),
    )
    const result = await hybridSelection(fixture)
    const hybridMetrics = metrics(
      fixture,
      result.memories.map((memory) => memory.id),
    )

    expect(baselineMetrics.recall).toBeLessThan(0.8)
    expect(hybridMetrics.recall).toBeGreaterThanOrEqual(0.8)
    expect(hybridMetrics.recall).toBeGreaterThan(baselineMetrics.recall)
  })

  it.each(
    memoryVectorRetrievalFixtures
      .filter((fixture) => fixture.embedding === null || fixture.embeddingFailure)
      .map((fixture) => [fixture.name, fixture] as const),
  )("%s: falls back bit-for-bit to S136", async (_name, fixture) => {
    const result = await hybridSelection(fixture)
    expect(result).toEqual(lexicalSelection(fixture))
  })

  it("never gives a semantic reason to a false-proximity memory", async () => {
    const fixture = memoryVectorRetrievalFixtures.find(
      (item) => item.nonSemanticIds !== undefined,
    )
    expect(fixture).toBeDefined()
    const result = await hybridSelection(fixture!)

    for (const id of fixture!.nonSemanticIds ?? []) {
      const entry = result.selection.find((item) => item.id === id)
      expect(entry).toBeDefined()
      expect(["semantic", "hybrid"]).not.toContain(entry?.reason)
    }
  })

  it("explains vector-driven inclusions with semantic or hybrid", async () => {
    for (const fixture of memoryVectorRetrievalFixtures) {
      if (!fixture.semanticIds && !fixture.hybridIds) continue
      const result = await hybridSelection(fixture)

      for (const id of fixture.semanticIds ?? []) {
        expect(result.selection.find((item) => item.id === id)).toMatchObject({
          included: true,
          reason: "semantic",
        })
      }
      for (const id of fixture.hybridIds ?? []) {
        expect(result.selection.find((item) => item.id === id)).toMatchObject({
          included: true,
          reason: "hybrid",
        })
      }
    }
  })

  it("marks the memories dropped by the semantic budget", async () => {
    const fixture = memoryVectorRetrievalFixtures.find(
      (item) => item.skipRecall && item.embedding !== null,
    )
    expect(fixture).toBeDefined()
    const result = await hybridSelection(fixture!)

    expect(result.selection.some((entry) => entry.reason === "budget")).toBe(
      true,
    )
    expect(result.tokens).toBeLessThanOrEqual(result.budget)
  })

  it.each(
    memoryVectorRetrievalFixtures.map((fixture) => [fixture.name, fixture] as const),
  )("%s: is deterministic across two runs", async (_name, fixture) => {
    const first = await hybridSelection(fixture)
    const second = await hybridSelection(fixture)

    expect(second.selection).toEqual(first.selection)
    expect(second.memories.map((memory) => memory.id)).toEqual(
      first.memories.map((memory) => memory.id),
    )
  })
})
