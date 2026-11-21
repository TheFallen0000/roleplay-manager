import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { Memory } from "../../../domain/entities/memory.entity"
import type {
  ApplyMemoryChangesResult,
  MemoryDTO,
  MemoryType,
} from "@workspace/shared/types/memory"
import type { ProcessedBy } from "../../../domain/entities/memory-change-proposal.entity"
import { findConsolidationTarget } from "./apply-memory-changes.use-case"

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

  async execute(input: ApplyAllMemoryChangesInput): Promise<ApplyMemoryChangesResult> {
    const proposals = await this.memoryChangeProposalRepository.findPendingByConversationId(
      input.conversationId,
    )

    const result: ApplyMemoryChangesResult = {
      memories: [],
      created: 0,
      updated: 0,
      discarded: 0,
    }
    if (proposals.length === 0) return result

    const conversationMemories =
      await this.memoryRepository.findByConversationId(input.conversationId)
    const now = new Date()

    for (const proposal of proposals) {
      try {
        const actor = proposal.actor
        const title = proposal.title
        const description = proposal.description
        const priority = proposal.priority
        const type: MemoryType = proposal.type

        switch (proposal.operation) {
          case "CREATE": {
            const existing = findConsolidationTarget(
              conversationMemories,
              actor,
              title,
            )
            if (existing) {
              const updated = existing.update(
                { description, priority, type },
                input.processedBy,
              )
              await this.memoryRepository.update(updated)
              replaceMemory(conversationMemories, updated)
              result.memories.push(toMemoryDTO(updated))
              result.updated += 1
              break
            }

            const memory = Memory.create({
              id: proposal.id,
              conversationId: input.conversationId,
              actor,
              title,
              description,
              priority,
              type,
              createdBy: "assistant",
              updatedBy: input.processedBy,
              createdAt: now,
              updatedAt: now,
            })
            await this.memoryRepository.create(memory)
            conversationMemories.push(memory)
            result.memories.push(toMemoryDTO(memory))
            result.created += 1
            break
          }

          case "UPDATE": {
            const targetId = proposal.targetMemoryId
            if (!targetId) {
              this.logger.warn("UPDATE proposal has no targetMemoryId, skipping")
              result.discarded += 1
              await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
              continue
            }
            const existing = await this.memoryRepository.findById(targetId)
            if (!existing) {
              this.logger.warn(`Target memory '${targetId}' not found for UPDATE, discarding`)
              result.discarded += 1
              await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
              continue
            }
            if (existing.matches({ actor, title, description, priority, type })) {
              result.discarded += 1
              await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
              continue
            }
            const updated = existing.update(
              { actor, title, description, priority, type },
              input.processedBy,
            )
            await this.memoryRepository.update(updated)
            result.memories.push(toMemoryDTO(updated))
            result.updated += 1
            break
          }

          case "DELETE": {
            const targetId = proposal.targetMemoryId
            if (!targetId) {
              this.logger.warn("DELETE proposal has no targetMemoryId, skipping")
              result.discarded += 1
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
        result.discarded += 1
        await this.memoryChangeProposalRepository.markProcessed(proposal.id, "discarded", input.processedBy)
      }
    }

    return result
  }
}

const replaceMemory = (memories: Memory[], updated: Memory): void => {
  const index = memories.findIndex((memory) => memory.id === updated.id)
  if (index === -1) {
    memories.push(updated)
  } else {
    memories[index] = updated
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
    type: m.type,
    createdBy: m.createdBy,
    updatedBy: m.updatedBy,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}
