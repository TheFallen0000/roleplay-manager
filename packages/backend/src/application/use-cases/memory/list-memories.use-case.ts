import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import type { MemoryDTO } from "@workspace/shared/types/memory"
import type { Memory } from "../../../domain/entities/memory.entity"
import { turnsSince } from "@workspace/shared/lib/memory-decay"

export class ListMemoriesUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly messageRepository: MessageHistoryRepository,
  ) {}

  async execute(conversationId: string): Promise<MemoryDTO[]> {
    const [memories, userMessageTimes] = await Promise.all([
      this.memoryRepository.findByConversationId(conversationId),
      this.messageRepository.findUserMessageTimes(conversationId),
    ])
    const messageTurns = userMessageTimes.map((createdAt) => ({
      role: "user",
      createdAt,
    }))

    return memories.map((memory) =>
      toMemoryDTO(
        memory,
        turnsSince(memory.updatedAt, messageTurns),
      ),
    )
  }
}

function toMemoryDTO(m: Memory, turnsSinceUpdate: number): MemoryDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    actor: m.actor,
    title: m.title,
    description: m.description,
    priority: m.priority,
    createdBy: m.createdBy,
    updatedBy: m.updatedBy,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    turnsSinceUpdate,
  }
}
