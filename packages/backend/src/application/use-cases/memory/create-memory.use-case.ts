import { v7 as randomUUIDv7 } from "uuid"

import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import { Memory } from "../../../domain/entities/memory.entity"
import type { CreateMemoryInput, MemoryDTO } from "@workspace/shared/types/memory"

export class CreateMemoryUseCase {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async execute(
    conversationId: string,
    input: CreateMemoryInput,
  ): Promise<MemoryDTO> {
    const now = new Date()

    const memory = Memory.create({
      id: randomUUIDv7(),
      conversationId,
      actor: input.actor,
      title: input.title,
      description: input.description,
      priority: input.priority ?? 5,
      type: input.type,
      createdBy: "user",
      updatedBy: "user",
      createdAt: now,
      updatedAt: now,
    })

    await this.memoryRepository.create(memory)

    return {
      id: memory.id,
      conversationId: memory.conversationId,
      actor: memory.actor,
      title: memory.title,
      description: memory.description,
      priority: memory.priority,
      type: memory.type,
      createdBy: memory.createdBy,
      updatedBy: memory.updatedBy,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
    }
  }
}
