import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import { NotFoundError } from "../../../domain/errors"
import type { UpdateMemoryInput, MemoryDTO } from "@workspace/shared/types/memory"

export class UpdateMemoryUseCase {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async execute(
    conversationId: string,
    memoryId: string,
    input: UpdateMemoryInput,
  ): Promise<MemoryDTO> {
    const existing = await this.memoryRepository.findById(memoryId)
    if (!existing) {
      throw new NotFoundError("MEMORY_NOT_FOUND", `Memory with id '${memoryId}' not found.`)
    }

    const updated = existing.update(
      {
        actor: input.actor,
        title: input.title,
        description: input.description,
        priority: input.priority,
      },
      "user",
    )

    await this.memoryRepository.update(updated)

    return {
      id: updated.id,
      conversationId: updated.conversationId,
      actor: updated.actor,
      title: updated.title,
      description: updated.description,
      priority: updated.priority,
      createdBy: updated.createdBy,
      updatedBy: updated.updatedBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }
  }
}
