import { createHash } from "node:crypto"

import type { EmbeddingRepository, MemoryEmbeddingRecord } from "../../../domain/ports/embedding.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../../../domain/ports/provider.port"
import { EmbeddingUnavailableError } from "../../../domain/errors"
import type { Memory } from "../../../domain/entities/memory.entity"

import type { EmbeddingRuntimeConfig } from "./embedding-config"
import { isProviderId } from "./embedding-config"

export interface MemoryEmbeddingServiceDeps {
  repository: EmbeddingRepository
  registry: ProviderRegistry
  providerInstanceRepository: ProviderInstanceRepository
}

export interface EmbedTextsResult {
  vectors: Float32Array[]
  dimension: number
  model?: string
}

/**
 * Produces and persists derived memory vectors.
 *
 * Every provider interaction is best effort: a missing `embed`, a provider
 * error or a timeout resolves to `null` so callers keep the lexical path. Vectors
 * are L2-normalized, so cosine similarity is a plain dot product.
 */
export class MemoryEmbeddingService {
  constructor(private readonly deps: MemoryEmbeddingServiceDeps) {}

  /** Stable hash of the embedded text. The actor is deliberately excluded. */
  textHash(memory: Pick<Memory, "title" | "description">): string {
    return createHash("sha256")
      .update(`${memory.title}\n${memory.description}`)
      .digest("hex")
  }

  async embedTexts(input: {
    texts: string[]
    config: EmbeddingRuntimeConfig
  }): Promise<EmbedTextsResult | null> {
    if (input.texts.length === 0) return { vectors: [], dimension: 0 }

    try {
      const adapter = await this.resolveAdapter(input.config)
      if (!adapter || typeof adapter.embed !== "function") return null

      const result = await adapter.embed({
        texts: input.texts,
        model: input.config.model,
      })
      const vectors = result.vectors.map((vector) => normalize(vector))
      const dimension =
        result.dimension > 0
          ? result.dimension
          : (vectors[0]?.length ?? 0)
      if (vectors.length !== input.texts.length) return null
      if (dimension <= 0) return null
      return {
        vectors,
        dimension,
        ...(result.model ? { model: result.model } : {}),
      }
    } catch {
      // ProviderError, ProviderTimeoutError and provider-specific failures all
      // degrade to "no vector" without reaching the caller.
      return null
    }
  }

  async embedMemory(input: {
    memory: Memory
    config: EmbeddingRuntimeConfig
  }): Promise<MemoryEmbeddingRecord | null> {
    const embedded = await this.embedTexts({
      texts: [`${input.memory.title}\n${input.memory.description}`],
      config: input.config,
    })
    if (!embedded) return null

    const vector = embedded.vectors[0]
    if (!vector) return null
    if (
      input.config.dimension !== null &&
      vector.length !== input.config.dimension
    ) {
      return null
    }

    const record = {
      memoryId: input.memory.id,
      provider: input.config.provider,
      model: embedded.model ?? input.config.model,
      dimension:
        input.config.dimension ?? embedded.dimension ?? vector.length,
      vector,
      textHash: this.textHash(input.memory),
    }

    try {
      await this.deps.repository.upsert(record)
    } catch {
      return null
    }

    const now = new Date()
    return { ...record, createdAt: now, updatedAt: now }
  }

  async embedQuery(input: {
    text: string
    config: EmbeddingRuntimeConfig
  }): Promise<Float32Array | null> {
    const embedded = await this.embedTexts({
      texts: [input.text],
      config: input.config,
    })
    const vector = embedded?.vectors[0]
    if (!vector) return null
    if (
      input.config.dimension !== null &&
      vector.length !== input.config.dimension
    ) {
      return null
    }
    return vector
  }

  private async resolveAdapter(
    config: EmbeddingRuntimeConfig,
  ): Promise<ProviderPort | null> {
    if (!isProviderId(config.provider)) {
      throw new EmbeddingUnavailableError(
        `Unknown embedding provider: ${config.provider}`,
      )
    }
    if (config.providerInstanceId) {
      const instance = await this.deps.providerInstanceRepository.findById(
        config.providerInstanceId,
      )
      if (!instance) {
        throw new EmbeddingUnavailableError(
          `Provider instance '${config.providerInstanceId}' not found.`,
        )
      }
      if (instance.kind !== config.provider) {
        throw new EmbeddingUnavailableError(
          `Provider instance '${config.providerInstanceId}' does not match '${config.provider}'.`,
        )
      }
      return this.deps.registry.createAdapter(instance)
    }
    try {
      return await this.deps.registry.getAdapter(config.provider)
    } catch (error) {
      throw new EmbeddingUnavailableError((error as Error).message)
    }
  }
}

const normalize = (vector: readonly number[]): Float32Array => {
  const norm = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  )
  const values = vector.map((value) => (norm === 0 ? 0 : value / norm))
  return Float32Array.from(values)
}
