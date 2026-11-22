import { v7 as randomUUIDv7 } from "uuid"

import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { Memory } from "../../../domain/entities/memory.entity"
import type { ApplyProposalDecision } from "@workspace/shared/types/memory-change-proposal"
import type {
  ApplyMemoryChangesResult,
  MemoryDTO,
  MemoryType,
} from "@workspace/shared/types/memory"
import { normalizeMemoryText } from "../../../lib/memory-text"

export interface ApplyMemoryChangesInput {
  conversationId: string
  decisions: ApplyProposalDecision[]
}

export class ApplyMemoryChangesUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryChangeProposalRepository: MemoryChangeProposalRepository,
    private readonly logger: Logger,
    private readonly onMemoryChanged?: (memory: Memory) => void,
  ) {}

  async execute(input: ApplyMemoryChangesInput): Promise<ApplyMemoryChangesResult> {
    const result: ApplyMemoryChangesResult = {
      memories: [],
      created: 0,
      updated: 0,
      discarded: 0,
    }
    const now = new Date()
    let conversationMemories: Memory[] | null = null

    const getConversationMemories = async (): Promise<Memory[]> => {
      conversationMemories ??=
        await this.memoryRepository.findByConversationId(input.conversationId)
      return conversationMemories
    }

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
        result.discarded += 1
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
      const type: MemoryType = overrides.type ?? proposal.type

      switch (proposal.operation) {
        case "CREATE": {
          const memories = await getConversationMemories()
          const existing = findConsolidationTarget(memories, actor, title)
          if (existing) {
            const updated = existing.update(
              { description, priority, type },
              "user",
            )
            await this.memoryRepository.update(updated)
            replaceMemory(memories, updated)
            this.onMemoryChanged?.(updated)
            result.memories.push(toMemoryDTO(updated))
            result.updated += 1
            break
          }

          const memory = Memory.create({
            id: randomUUIDv7(),
            conversationId: input.conversationId,
            actor,
            title,
            description,
            priority,
            type,
            createdBy: "user",
            updatedBy: "user",
            createdAt: now,
            updatedAt: now,
          })
          await this.memoryRepository.create(memory)
          memories.push(memory)
          this.onMemoryChanged?.(memory)
          result.memories.push(toMemoryDTO(memory))
          result.created += 1
          break
        }

        case "UPDATE": {
          const targetId = proposal.targetMemoryId
          if (!targetId) {
            this.logger.warn("UPDATE proposal has no targetMemoryId, skipping")
            result.discarded += 1
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
            result.discarded += 1
            await this.memoryChangeProposalRepository.markProcessed(
              decision.proposalId,
              "discarded",
              "user",
            )
            continue
          }
          if (existing.matches({ actor, title, description, priority, type })) {
            result.discarded += 1
            await this.memoryChangeProposalRepository.markProcessed(
              decision.proposalId,
              "discarded",
              "user",
            )
            continue
          }
          const updated = existing.update(
            { actor, title, description, priority, type },
            "user",
          )
          await this.memoryRepository.update(updated)
          result.memories.push(toMemoryDTO(updated))
          this.onMemoryChanged?.(updated)
          result.updated += 1
          break
        }

        case "DELETE": {
          const targetId = proposal.targetMemoryId
          if (!targetId) {
            this.logger.warn("DELETE proposal has no targetMemoryId, skipping")
            result.discarded += 1
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

    return result
  }
}

export const findConsolidationTarget = (
  memories: readonly Memory[],
  actor: string,
  title: string,
): Memory | undefined => {
  const actorKey = normalizeMemoryText(actor)
  const titleKey = normalizeMemoryText(title)
  return memories.find(
    (memory) =>
      normalizeMemoryText(memory.actor) === actorKey &&
      normalizeMemoryText(memory.title) === titleKey,
  )
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
