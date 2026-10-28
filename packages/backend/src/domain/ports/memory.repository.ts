import type { Memory } from "../entities/memory.entity"

export interface MemoryRepository {
  findById(id: string): Promise<Memory | null>
  findByConversationId(
    conversationId: string,
    limit?: number,
  ): Promise<Memory[]>
  create(memory: Memory): Promise<Memory>
  update(memory: Memory): Promise<Memory>
  deleteById(id: string): Promise<void>
}
