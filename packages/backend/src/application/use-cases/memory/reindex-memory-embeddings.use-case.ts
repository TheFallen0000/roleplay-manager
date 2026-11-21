import type { ReindexEmbeddingsResultDTO } from "@workspace/shared/types/embedding"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type {
  EmbeddingRepository,
  EmbeddingTarget,
  MemoryEmbeddingRecord,
} from "../../../domain/ports/embedding.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import type { Memory } from "../../../domain/entities/memory.entity"

import type { EmbeddingRuntimeConfig } from "../../services/embedding/embedding-config"
import {
  EMBEDDING_SETTINGS_KEYS,
  resolveEmbeddingConfig,
} from "../../services/embedding/embedding-config"
import type { MemoryEmbeddingService } from "../../services/embedding/memory-embedding.service"

const BATCH_SIZE = 16

export interface ReindexMemoryEmbeddingsDeps {
  conversationRepository: ConversationRepository
  memoryRepository: MemoryRepository
  embeddingRepository: EmbeddingRepository
  embeddingService: MemoryEmbeddingService
  settings: SettingsRepository
  /** Injectable reader; defaults to the settings-backed resolver. */
  resolveConfig?: () => Promise<EmbeddingRuntimeConfig | null>
}

/**
 * Manual global reindex. It walks every conversation, re-embeds memories without
 * a usable vector and memories whose stored `text_hash` no longer matches the
 * current text, in batches of 16. Failures are counted per memory and never
 * abort the rest of the run.
 */
export class ReindexMemoryEmbeddingsUseCase {
  constructor(private readonly deps: ReindexMemoryEmbeddingsDeps) {}

  async execute(): Promise<ReindexEmbeddingsResultDTO> {
    const config = this.deps.resolveConfig
      ? await this.deps.resolveConfig()
      : await this.defaultResolveConfig()

    const conversations = await this.deps.conversationRepository.list()
    if (!config) {
      let missing = 0
      for (const conversation of conversations) {
        const memories = await this.deps.memoryRepository.findByConversationId(
          conversation.id,
        )
        missing += memories.length
      }
      return { indexed: 0, missing, failed: 0 }
    }

    const result: ReindexEmbeddingsResultDTO = {
      indexed: 0,
      missing: 0,
      failed: 0,
    }
    let dimension = config.dimension

    for (const conversation of conversations) {
      const memories = await this.deps.memoryRepository.findByConversationId(
        conversation.id,
      )
      if (memories.length === 0) continue

      const target: EmbeddingTarget = {
        provider: config.provider,
        model: config.model,
        dimension,
      }
      const missingIds = new Set(
        await this.deps.embeddingRepository.listMissingForConversation(
          conversation.id,
          target,
        ),
      )
      const rows = await this.deps.embeddingRepository.findByMemoryIds(
        memories.map((memory) => memory.id),
      )
      const staleIds = this.findStaleIds(memories, rows, target)
      const candidates = memories.filter(
        (memory) => missingIds.has(memory.id) || staleIds.has(memory.id),
      )

      for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
        const batch = candidates.slice(start, start + BATCH_SIZE)
        const embedded = await this.tryEmbed(batch, config, dimension)
        if (!embedded || embedded.vectors.length !== batch.length) {
          result.failed += batch.length
          continue
        }

        if (dimension === null) {
          dimension = embedded.dimension
          await this.deps.settings.set(
            EMBEDDING_SETTINGS_KEYS.dimension,
            String(dimension),
          )
        }

        for (let index = 0; index < batch.length; index += 1) {
          const memory = batch[index]!
          const vector = embedded.vectors[index]
          if (!vector) {
            result.failed += 1
            continue
          }
          try {
            await this.deps.embeddingRepository.upsert({
              memoryId: memory.id,
              provider: config.provider,
              model: config.model,
              dimension: dimension ?? vector.length,
              vector,
              textHash: this.deps.embeddingService.textHash(memory),
            })
            result.indexed += 1
          } catch {
            result.failed += 1
          }
        }
      }

      const status = await this.deps.embeddingRepository.countStatus(
        conversation.id,
        {
          provider: config.provider,
          model: config.model,
          dimension,
        },
      )
      result.missing += status.missing
    }

    return result
  }

  private findStaleIds(
    memories: Memory[],
    rows: MemoryEmbeddingRecord[],
    target: EmbeddingTarget,
  ): Set<string> {
    if (target.dimension === null) return new Set()
    const rowsByMemory = new Map(rows.map((row) => [row.memoryId, row]))
    const stale = new Set<string>()
    for (const memory of memories) {
      const row = rowsByMemory.get(memory.id)
      if (!row) continue
      if (!matchesTarget(row, target)) continue
      if (row.textHash !== this.deps.embeddingService.textHash(memory)) {
        stale.add(memory.id)
      }
    }
    return stale
  }

  private async tryEmbed(
    memories: Memory[],
    config: EmbeddingRuntimeConfig,
    dimension: number | null,
  ): Promise<{ vectors: Float32Array[]; dimension: number } | null> {
    if (memories.length === 0) return { vectors: [], dimension: dimension ?? 0 }
    try {
      return await this.deps.embeddingService.embedTexts({
        texts: memories.map(
          (memory) => `${memory.title}\n${memory.description}`,
        ),
        config: { ...config, dimension },
      })
    } catch {
      return null
    }
  }

  private async defaultResolveConfig(): Promise<EmbeddingRuntimeConfig | null> {
    return resolveEmbeddingConfig(this.deps.settings)
  }
}

const matchesTarget = (
  row: MemoryEmbeddingRecord,
  target: EmbeddingTarget,
): boolean =>
  target.dimension !== null &&
  row.provider === target.provider &&
  row.model === target.model &&
  row.dimension === target.dimension
