/**
 * Derived memory vectors (S137). The port is persistence-only: it never reads
 * memory text and never compares `text_hash`. Staleness by text is resolved by
 * the reindex use case, which knows the current title/description.
 */
export interface EmbeddingTarget {
  provider: string
  model: string
  /** Active dimension; `null` means no usable vector exists yet. */
  dimension: number | null
}

export interface MemoryEmbeddingRecord {
  memoryId: string
  provider: string
  model: string
  dimension: number
  /** Little-endian Float32Array round-tripped through a BLOB. */
  vector: Float32Array
  textHash: string
  createdAt: Date
  updatedAt: Date
}

export type MemoryEmbeddingWrite = Omit<
  MemoryEmbeddingRecord,
  "createdAt" | "updatedAt"
>

export interface EmbeddingStatus {
  indexed: number
  missing: number
}

export interface EmbeddingRepository {
  upsert(record: MemoryEmbeddingWrite): Promise<void>
  findByMemoryIds(memoryIds: string[]): Promise<MemoryEmbeddingRecord[]>
  deleteByMemoryId(memoryId: string): Promise<void>
  deleteByMemoryIds(memoryIds: string[]): Promise<void>
  /**
   * Memories without a row or whose row has a different
   * provider/model/dimension. A `null` dimension means every memory is missing.
   */
  listMissingForConversation(
    conversationId: string,
    target: EmbeddingTarget,
  ): Promise<string[]>
  countStatus(
    conversationId: string,
    target: EmbeddingTarget,
  ): Promise<EmbeddingStatus>
}
