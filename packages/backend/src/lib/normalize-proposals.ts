import type { Memory } from "../domain/entities/memory.entity"
import type { ProposalOperation } from "../domain/entities/memory-change-proposal.entity"
import type { RawProposal } from "./memory-proposal-extractor"

export interface NormalizedProposal {
  operation: ProposalOperation
  targetMemoryId: string | null
  actor: string
  title: string
  description: string
  priority: number
}

export interface NormalizeProposalsResult {
  proposals: NormalizedProposal[]
  dropped: number
}

const clampPriority = (value: number | undefined, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.min(10, Math.max(1, Math.round(value)))
}

/**
 * Turns loose model output into proposals the domain can persist. CREATE needs
 * its own fields; UPDATE and DELETE are hydrated from the target memory so a
 * partial proposal cannot wipe description or priority. Proposals that cannot
 * be applied (unknown target, missing CREATE fields) are dropped individually
 * instead of failing the whole batch.
 */
export function normalizeProposals(
  raws: readonly RawProposal[],
  memories: readonly Memory[],
): NormalizeProposalsResult {
  const byId = new Map(memories.map((memory) => [memory.id, memory]))
  const proposals: NormalizedProposal[] = []
  let dropped = 0

  for (const raw of raws) {
    if (raw.operation === "CREATE") {
      const actor = raw.actor.trim()
      const title = raw.title.trim()
      if (!actor || !title) {
        dropped++
        continue
      }
      proposals.push({
        operation: "CREATE",
        targetMemoryId: null,
        actor,
        title,
        description: raw.description.trim(),
        priority: clampPriority(raw.priority, 5),
      })
      continue
    }

    const target = raw.targetMemoryId
      ? byId.get(raw.targetMemoryId)
      : undefined
    if (!target) {
      dropped++
      continue
    }

    if (raw.operation === "DELETE") {
      proposals.push({
        operation: "DELETE",
        targetMemoryId: target.id,
        actor: target.actor,
        title: target.title,
        description: target.description,
        priority: target.priority,
      })
      continue
    }

    proposals.push({
      operation: "UPDATE",
      targetMemoryId: target.id,
      actor: raw.actor.trim() || target.actor,
      title: raw.title.trim() || target.title,
      description: raw.description.trim() || target.description,
      priority: clampPriority(raw.priority, target.priority),
    })
  }

  return { proposals, dropped }
}
