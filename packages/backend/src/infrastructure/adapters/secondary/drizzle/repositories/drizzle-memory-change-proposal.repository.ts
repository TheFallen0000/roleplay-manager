import { and, eq } from "drizzle-orm"

import { MemoryChangeProposal } from "../../../../../domain/entities/memory-change-proposal.entity"
import type { ProcessedBy, ProposalStatus } from "../../../../../domain/entities/memory-change-proposal.entity"
import type { MemoryChangeProposalRepository } from "../../../../../domain/ports/memory-change-proposal.repository"
import type { Database } from "../../../../config/database"
import { memoryChangeProposals } from "../schema"

type ProposalRow = typeof memoryChangeProposals.$inferSelect

const toProposal = (row: ProposalRow): MemoryChangeProposal =>
  MemoryChangeProposal.reconstruct({
    id: row.id,
    conversationId: row.conversationId,
    operation: row.operation as "CREATE" | "UPDATE" | "DELETE",
    targetMemoryId: row.targetMemoryId ?? null,
    actor: row.actor,
    title: row.title,
    description: row.description,
    priority: row.priority,
    type: row.type as MemoryChangeProposal["type"],
    status: row.status as ProposalStatus,
    createdAt: new Date(row.createdAt),
    processedAt: row.processedAt ? new Date(row.processedAt) : null,
    processedBy: row.processedBy as ProcessedBy,
  })

export class DrizzleMemoryChangeProposalRepository
  implements MemoryChangeProposalRepository
{
  constructor(private readonly db: Database) {}

  async create(proposal: MemoryChangeProposal): Promise<MemoryChangeProposal> {
    await this.db.insert(memoryChangeProposals).values({
      id: proposal.id,
      conversationId: proposal.conversationId,
      operation: proposal.operation,
      targetMemoryId: proposal.targetMemoryId,
      actor: proposal.actor,
      title: proposal.title,
      description: proposal.description,
      priority: proposal.priority,
      type: proposal.type,
      status: proposal.status,
      createdAt: proposal.createdAt,
      processedAt: proposal.processedAt,
      processedBy: proposal.processedBy,
    })

    return proposal
  }

  async createMany(proposals: MemoryChangeProposal[]): Promise<void> {
    if (proposals.length === 0) return

    await this.db.insert(memoryChangeProposals).values(
      proposals.map((p) => ({
        id: p.id,
        conversationId: p.conversationId,
        operation: p.operation,
        targetMemoryId: p.targetMemoryId,
        actor: p.actor,
        title: p.title,
        description: p.description,
        priority: p.priority,
        type: p.type,
        status: p.status,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
        processedBy: p.processedBy,
      })),
    )
  }

  async findById(id: string): Promise<MemoryChangeProposal | null> {
    const rows = await this.db
      .select()
      .from(memoryChangeProposals)
      .where(eq(memoryChangeProposals.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toProposal(rows[0])
  }

  async findPendingByConversationId(conversationId: string): Promise<MemoryChangeProposal[]> {
    const rows = await this.db
      .select()
      .from(memoryChangeProposals)
      .where(
        and(
          eq(memoryChangeProposals.conversationId, conversationId),
          eq(memoryChangeProposals.status, "pending"),
        ),
      )
      .orderBy(memoryChangeProposals.createdAt)

    return rows.map(toProposal)
  }

  async findByConversationId(conversationId: string): Promise<MemoryChangeProposal[]> {
    const rows = await this.db
      .select()
      .from(memoryChangeProposals)
      .where(eq(memoryChangeProposals.conversationId, conversationId))
      .orderBy(memoryChangeProposals.createdAt)

    return rows.map(toProposal)
  }

  async update(proposal: MemoryChangeProposal): Promise<MemoryChangeProposal> {
    await this.db
      .update(memoryChangeProposals)
      .set({
        operation: proposal.operation,
        targetMemoryId: proposal.targetMemoryId,
        actor: proposal.actor,
        title: proposal.title,
        description: proposal.description,
        priority: proposal.priority,
        type: proposal.type,
        status: proposal.status,
        processedAt: proposal.processedAt,
        processedBy: proposal.processedBy,
      })
      .where(eq(memoryChangeProposals.id, proposal.id))

    return proposal
  }

  async markProcessed(
    id: string,
    status: ProposalStatus,
    processedBy: ProcessedBy,
  ): Promise<void> {
    await this.db
      .update(memoryChangeProposals)
      .set({
        status,
        processedBy,
        processedAt: new Date(),
      })
      .where(eq(memoryChangeProposals.id, id))
  }

  async discardPendingByConversationId(conversationId: string): Promise<void> {
    await this.db
      .update(memoryChangeProposals)
      .set({
        status: "discarded",
        processedAt: new Date(),
        processedBy: "system",
      })
      .where(
        and(
          eq(memoryChangeProposals.conversationId, conversationId),
          eq(memoryChangeProposals.status, "pending"),
        ),
      )
  }
}
