import type { Memory } from "../../domain/entities/memory.entity"
import type { EmbeddingRepository } from "../../domain/ports/embedding.repository"

import type { EmbeddingRuntimeConfig } from "./embedding/embedding-config"
import type { MemoryEmbeddingService } from "./embedding/memory-embedding.service"
import {
  selectMemoriesForPrompt,
  type SelectMemoriesResult,
} from "./memory-retrieval.service"

export interface MemoryHybridRetrievalInput {
  conversation: Parameters<typeof selectMemoriesForPrompt>[0]["conversation"]
  memories: Memory[]
  messages: readonly { role: string; createdAt: Date }[]
  pendingMessage: string
  mainActors: readonly string[]
  /** `null` disables semantic scoring for this request. */
  embedding: EmbeddingRuntimeConfig | null
  /** Overrides the policy budget (e.g. the summary memory section). */
  budget?: number
}

export interface MemoryHybridRetrievalDeps {
  embeddingService: MemoryEmbeddingService
  embeddingRepository: EmbeddingRepository
}

/**
 * Async orchestrator for the hybrid memory retrieval.
 *
 * `selectMemoriesForPrompt` stays synchronous; this service resolves the
 * semantic scores (provider call + stored vectors) and then delegates the
 * fusion, ordering and budget to the S136 selector. Any missing or failed
 * signal resolves to the lexical result unchanged.
 */
export class MemoryHybridRetrievalService {
  constructor(private readonly deps: MemoryHybridRetrievalDeps) {}

  async retrieve(
    input: MemoryHybridRetrievalInput,
  ): Promise<SelectMemoriesResult> {
    const semanticScores = await this.resolveSemanticScores(input)
    return selectMemoriesForPrompt({
      conversation: input.conversation,
      memories: input.memories,
      messages: input.messages,
      pendingMessage: input.pendingMessage,
      mainActors: input.mainActors,
      ...(semanticScores ? { semanticScores } : {}),
      ...(input.budget !== undefined ? { budget: input.budget } : {}),
    })
  }

  private async resolveSemanticScores(
    input: MemoryHybridRetrievalInput,
  ): Promise<Map<string, number> | undefined> {
    const config = input.embedding
    if (!config || config.dimension === null) return undefined
    if (input.memories.length === 0) return undefined

    const queryVector = await this.deps.embeddingService.embedQuery({
      text: input.pendingMessage,
      config,
    })
    if (!queryVector) return undefined

    const rows = await this.deps.embeddingRepository.findByMemoryIds(
      input.memories.map((memory) => memory.id),
    )
    if (rows.length === 0) return undefined

    const memoriesById = new Map(
      input.memories.map((memory) => [memory.id, memory]),
    )
    const scores = new Map<string, number>()
    for (const row of rows) {
      const memory = memoriesById.get(row.memoryId)
      if (!memory) continue
      if (row.provider !== config.provider) continue
      if (row.model !== config.model) continue
      if (row.dimension !== config.dimension) continue
      if (row.textHash !== this.deps.embeddingService.textHash(memory)) {
        continue
      }
      const cosine = cosineSimilarity(queryVector, row.vector)
      scores.set(row.memoryId, clampCosine(cosine))
    }

    return scores.size > 0 ? scores : undefined
  }
}

const clampCosine = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0

const cosineSimilarity = (
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number => {
  const length = Math.min(left.length, right.length)
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    dot += a * b
    leftNorm += a * a
    rightNorm += b * b
  }
  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / Math.sqrt(leftNorm * rightNorm)
}
