import { eq } from "drizzle-orm"

import { Memory } from "../../../../../domain/entities/memory.entity"
import type { MemoryRepository } from "../../../../../domain/ports/memory.repository"
import type { Database } from "../../../../config/database"
import { memories } from "../schema"

type MemoryRow = typeof memories.$inferSelect

const toMemory = (row: MemoryRow): Memory =>
  Memory.reconstruct({
    id: row.id,
    conversationId: row.conversationId,
    actor: row.actor,
    title: row.title,
    description: row.description,
    priority: row.priority,
    createdBy: row.createdBy as "user" | "assistant",
    updatedBy: row.updatedBy as "user" | "assistant" | "system",
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  })

export class DrizzleMemoryRepository implements MemoryRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Memory | null> {
    const rows = await this.db
      .select()
      .from(memories)
      .where(eq(memories.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toMemory(rows[0])
  }

  async findByConversationId(
    conversationId: string,
    limit?: number,
  ): Promise<Memory[]> {
    const query = this.db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
      .orderBy(memories.priority)
    const rows = limit ? await query.limit(limit) : await query

    return rows.map(toMemory)
  }

  async create(memory: Memory): Promise<Memory> {
    await this.db.insert(memories).values({
      id: memory.id,
      conversationId: memory.conversationId,
      actor: memory.actor,
      title: memory.title,
      description: memory.description,
      priority: memory.priority,
      createdBy: memory.createdBy,
      updatedBy: memory.updatedBy,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    })

    return memory
  }

  async update(memory: Memory): Promise<Memory> {
    await this.db
      .update(memories)
      .set({
        actor: memory.actor,
        title: memory.title,
        description: memory.description,
        priority: memory.priority,
        updatedBy: memory.updatedBy,
        updatedAt: memory.updatedAt,
      })
      .where(eq(memories.id, memory.id))

    return memory
  }

  async deleteById(id: string): Promise<void> {
    await this.db
      .delete(memories)
      .where(eq(memories.id, id))
  }
}
