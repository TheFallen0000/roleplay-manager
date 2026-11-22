import { and, eq, inArray, isNull, ne, or } from "drizzle-orm"

import type {
  EmbeddingRepository,
  EmbeddingStatus,
  EmbeddingTarget,
  MemoryEmbeddingRecord,
  MemoryEmbeddingWrite,
} from "../../../../../domain/ports/embedding.repository"
import type { Database } from "../../../../config/database"
import { memories } from "../schema"
import { memoryEmbeddings } from "../schema/memory-embeddings.schema"

type MemoryEmbeddingRow = typeof memoryEmbeddings.$inferSelect

const toRecord = (row: MemoryEmbeddingRow): MemoryEmbeddingRecord => ({
  memoryId: row.memoryId,
  provider: row.provider,
  model: row.model,
  dimension: row.dimension,
  vector: fromBuffer(row.vector),
  textHash: row.textHash,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

/** Explicit little-endian encoding; SQLite BLOBs are byte arrays. */
const toBuffer = (vector: Float32Array): Buffer => {
  const buffer = Buffer.alloc(vector.length * 4)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  for (let index = 0; index < vector.length; index += 1) {
    view.setFloat32(index * 4, vector[index] ?? 0, true)
  }
  return buffer
}

const fromBuffer = (buffer: Buffer): Float32Array => {
  const length = Math.floor(buffer.byteLength / 4)
  const vector = new Float32Array(length)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  for (let index = 0; index < length; index += 1) {
    vector[index] = view.getFloat32(index * 4, true)
  }
  return vector
}

export class DrizzleMemoryEmbeddingRepository implements EmbeddingRepository {
  constructor(private readonly db: Database) {}

  async upsert(record: MemoryEmbeddingWrite): Promise<void> {
    const now = new Date()
    await this.db
      .insert(memoryEmbeddings)
      .values({
        memoryId: record.memoryId,
        provider: record.provider,
        model: record.model,
        dimension: record.dimension,
        vector: toBuffer(record.vector),
        textHash: record.textHash,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: memoryEmbeddings.memoryId,
        set: {
          provider: record.provider,
          model: record.model,
          dimension: record.dimension,
          vector: toBuffer(record.vector),
          textHash: record.textHash,
          updatedAt: now,
        },
      })
  }

  async findByMemoryIds(
    memoryIds: string[],
  ): Promise<MemoryEmbeddingRecord[]> {
    if (memoryIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(memoryEmbeddings)
      .where(inArray(memoryEmbeddings.memoryId, memoryIds))
    return rows.map(toRecord)
  }

  async deleteByMemoryId(memoryId: string): Promise<void> {
    await this.db
      .delete(memoryEmbeddings)
      .where(eq(memoryEmbeddings.memoryId, memoryId))
  }

  async deleteByMemoryIds(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return
    await this.db
      .delete(memoryEmbeddings)
      .where(inArray(memoryEmbeddings.memoryId, memoryIds))
  }

  async listMissingForConversation(
    conversationId: string,
    target: EmbeddingTarget,
  ): Promise<string[]> {
    if (target.dimension === null) {
      const rows = await this.db
        .select({ id: memories.id })
        .from(memories)
        .where(eq(memories.conversationId, conversationId))
      return rows.map((row) => row.id)
    }

    const provider = target.provider
    const rows = await this.db
      .select({ id: memories.id })
      .from(memories)
      .leftJoin(
        memoryEmbeddings,
        eq(memoryEmbeddings.memoryId, memories.id),
      )
      .where(
        and(
          eq(memories.conversationId, conversationId),
          or(
            isNull(memoryEmbeddings.memoryId),
            ne(memoryEmbeddings.provider, provider),
            ne(memoryEmbeddings.model, target.model),
            ne(memoryEmbeddings.dimension, target.dimension),
          ),
        ),
      )
    return rows.map((row) => row.id)
  }

  async countStatus(
    conversationId: string,
    target: EmbeddingTarget,
  ): Promise<EmbeddingStatus> {
    const rows = await this.db
      .select({ id: memories.id })
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
    const missing = await this.listMissingForConversation(
      conversationId,
      target,
    )
    return {
      indexed: Math.max(0, rows.length - missing.length),
      missing: missing.length,
    }
  }
}
