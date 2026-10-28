import { v7 as randomUUIDv7 } from "uuid"

import { MemoryChangeProposal } from "../domain/entities/memory-change-proposal.entity"
import type { MemoryChangeProposalRepository } from "../domain/ports/memory-change-proposal.repository"
import type { Logger } from "../domain/ports/logger.port"
import type { NormalizedProposal } from "./normalize-proposals"

/**
 * Persists one generation's proposals as pending, with a shared timestamp.
 * Saving must finish before the `done` event: the client reloads proposals as
 * soon as it receives it, so writing afterwards leaves the panel stale.
 */
export async function saveMemoryProposals(
  repository: MemoryChangeProposalRepository,
  conversationId: string,
  proposals: readonly NormalizedProposal[],
  logger: Logger,
): Promise<void> {
  if (proposals.length === 0) return

  const now = new Date()
  const entities = proposals.map((proposal) =>
    MemoryChangeProposal.create({
      id: randomUUIDv7(),
      conversationId,
      operation: proposal.operation,
      targetMemoryId: proposal.targetMemoryId,
      actor: proposal.actor,
      title: proposal.title,
      description: proposal.description,
      priority: proposal.priority,
      status: "pending",
      createdAt: now,
      processedAt: null,
      processedBy: "user",
    }),
  )

  try {
    await repository.createMany(entities)
  } catch (error) {
    logger.error("Failed to save memory proposals", error as Error, {
      conversationId,
    })
  }
}
