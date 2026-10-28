import { desc, eq, inArray } from "drizzle-orm"

import { Summary } from "../../../../../domain/entities/summary.entity"
import type { SummaryRepository } from "../../../../../domain/ports/summary.repository"
import type { Database } from "../../../../config/database"
import { summaries } from "../schema"

type SummaryRow = typeof summaries.$inferSelect

const toSummary = (row: SummaryRow): Summary =>
  Summary.reconstruct({
    id: row.id,
    conversationId: row.conversationId,
    content: row.content,
    firstMessageId: row.firstMessageId,
    lastMessageId: row.lastMessageId,
    model: row.model,
    provider: row.provider,
    createdAt: new Date(row.createdAt),
    editedAt: row.editedAt ? new Date(row.editedAt) : null,
  })

export class DrizzleSummaryRepository implements SummaryRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Summary | null> {
    const rows = await this.db
      .select()
      .from(summaries)
      .where(eq(summaries.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toSummary(rows[0])
  }

  async findByConversationId(
    conversationId: string,
    limit?: number,
  ): Promise<Summary[]> {
    const query = this.db
      .select()
      .from(summaries)
      .where(eq(summaries.conversationId, conversationId))
      .orderBy(desc(summaries.createdAt))
    const rows = limit ? await query.limit(limit) : await query

    return rows.map(toSummary)
  }

  async findLatestByConversationId(conversationId: string): Promise<Summary | null> {
    const rows = await this.db
      .select()
      .from(summaries)
      .where(eq(summaries.conversationId, conversationId))
      .orderBy(desc(summaries.createdAt))
      .limit(1)

    if (rows.length === 0) return null
    return toSummary(rows[0])
  }

  async create(summary: Summary): Promise<Summary> {
    await this.db.insert(summaries).values({
      id: summary.id,
      conversationId: summary.conversationId,
      content: summary.content,
      firstMessageId: summary.firstMessageId,
      lastMessageId: summary.lastMessageId,
      model: summary.model,
      provider: summary.provider,
      createdAt: summary.createdAt,
      editedAt: summary.editedAt,
    })

    return summary
  }

  async update(summary: Summary): Promise<Summary> {
    await this.db
      .update(summaries)
      .set({
        content: summary.content,
        editedAt: summary.editedAt,
      })
      .where(eq(summaries.id, summary.id))

    return summary
  }

  async deleteById(id: string): Promise<void> {
    await this.db
      .delete(summaries)
      .where(eq(summaries.id, id))
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.db
      .delete(summaries)
      .where(inArray(summaries.id, ids))
  }
}
