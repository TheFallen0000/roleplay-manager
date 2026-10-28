import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { Memory } from "../../../domain/entities/memory.entity"
import type { MemoryDTO } from "@workspace/shared/types/memory"
import type { ProcessedBy } from "../../../domain/entities/memory-change-proposal.entity"

export interface ApplyAllMemoryChangesInput {
  conversationId: string
  processedBy: ProcessedBy
}

export class ApplyAllMemoryChangesUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryChangeProposalRepository: MemoryChangeProposalRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: ApplyAllMemoryChangesInput): Promise<MemoryDTO[]> {
    const proposals = await this.memoryChangeProposalRepository.findPendingByConversationId(
      input.conversationId,
    )

    if (proposals.length === 0) return []

    const updatedMemories: Memory[] = []
    const now = new Date()

    for (const proposal of proposals) {
      try {
        const actor = proposal.actor
        const title = proposal.title
        const description = proposal.description
        const priority = proposal.priority

        switch (proposal.operation) {
          case "CREATE": {
            const memory = Memory.create({
              id: proposal.id,
              conversationId: input.conversationId,
              actor,
              title,
              description,
              priority,
              createdBy: "assistant",
              updatedBy: "system",
              createdAt: now,
              updatedAt: now,
            })
            await this.memoryRepository.create(memory)
            updatedMemories.push(memory)
            break
          }

          case "UPDATE": {
            const targetId = proposal.targetMemoryId
            if (!targetId) {
              this.logger.warn("UPDATE proposal has no targetMemoryId, skipping")
              await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
              continue
            }
            const existing = await this.memoryRepository.findById(targetId)
            if (!existing) {
              this.logger.warn(`Target memory '${targetId}' not found for UPDATE, discarding`)
              await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
              continue
            }
            if (existing.matches({ actor, title, description, priority })) {
              await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
              continue
            }
            const updated = existing.update(
              { actor, title, description, priority },
              input.processedBy,
            )
            await this.memoryRepository.update(updated)
            updatedMemories.push(updated)
            break
          }

          case "DELETE": {
            const targetId = proposal.targetMemoryId
            if (!targetId) {
              this.logger.warn("DELETE proposal has no targetMemoryId, skipping")
              await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
              continue
            }
            await this.memoryRepository.deleteById(targetId)
            break
          }
        }

        await this.memoryChangeProposalRepository.markProcessed(
          proposal.id,
          "applied",
          input.processedBy,
        )
      } catch (error) {
        this.logger.error("Failed to auto-apply proposal", error as Error, {
          proposalId: proposal.id,
        })
        await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
      }
    }

    return updatedMemories.map(toMemoryDTO)
  }
}

function toMemoryDTO(m: Memory): MemoryDTO {
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
  }
}
