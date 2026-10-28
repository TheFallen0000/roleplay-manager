import { v7 as randomUUIDv7 } from "uuid"

import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { Memory } from "../../../domain/entities/memory.entity"
import type { ApplyProposalDecision } from "@workspace/shared/types/memory-change-proposal"
import type { MemoryDTO } from "@workspace/shared/types/memory"

export interface ApplyMemoryChangesInput {
  conversationId: string
  decisions: ApplyProposalDecision[]
}

export class ApplyMemoryChangesUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryChangeProposalRepository: MemoryChangeProposalRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: ApplyMemoryChangesInput): Promise<MemoryDTO[]> {
    const updatedMemories: Memory[] = []
    const now = new Date()

    for (const decision of input.decisions) {
      const proposal = await this.memoryChangeProposalRepository.findById(decision.proposalId)
      if (!proposal) {
        this.logger.warn(`Proposal '${decision.proposalId}' not found, skipping`)
        continue
      }

      if (proposal.status !== "pending") {
        this.logger.warn(`Proposal '${decision.proposalId}' is already ${proposal.status}, skipping`)
        continue
      }

      if (decision.action === "discard") {
        await this.memoryChangeProposalRepository.markProcessed(
          decision.proposalId,
          "discarded",
          "user",
        )
        continue
      }

      const overrides = decision.overrides ?? {}
      const actor = overrides.actor ?? proposal.actor
      const title = overrides.title ?? proposal.title
      const description = overrides.description ?? proposal.description
      const priority = overrides.priority ?? proposal.priority

      switch (proposal.operation) {
        case "CREATE": {
          const memory = Memory.create({
            id: randomUUIDv7(),
            conversationId: input.conversationId,
            actor,
            title,
            description,
            priority,
            createdBy: "user",
            updatedBy: "user",
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
            await this.memoryChangeProposalRepository.markProcessed(
              decision.proposalId,
              "discarded",
              "user",
            )
            continue
          }
          const existing = await this.memoryRepository.findById(targetId)
          if (!existing) {
            this.logger.warn(`Target memory '${targetId}' not found for UPDATE proposal, discarding`)
            await this.memoryChangeProposalRepository.markProcessed(
              decision.proposalId,
              "discarded",
              "user",
            )
            continue
          }
          if (existing.matches({ actor, title, description, priority })) {
            await this.memoryChangeProposalRepository.markProcessed(
              decision.proposalId,
              "discarded",
              "user",
            )
            continue
          }
          const updated = existing.update(
            { actor, title, description, priority },
            "user",
          )
          await this.memoryRepository.update(updated)
          updatedMemories.push(updated)
          break
        }

        case "DELETE": {
          const targetId = proposal.targetMemoryId
          if (!targetId) {
            this.logger.warn("DELETE proposal has no targetMemoryId, skipping")
            await this.memoryChangeProposalRepository.markProcessed(
              decision.proposalId,
              "discarded",
              "user",
            )
            continue
          }
          await this.memoryRepository.deleteById(targetId)
          break
        }
      }

      await this.memoryChangeProposalRepository.markProcessed(
        decision.proposalId,
        "applied",
        "user",
      )
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
