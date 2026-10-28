import type { Summary } from "../entities/summary.entity"

export interface SummaryRepository {
  findById(id: string): Promise<Summary | null>
  findByConversationId(
    conversationId: string,
    limit?: number,
  ): Promise<Summary[]>
  findLatestByConversationId(conversationId: string): Promise<Summary | null>
  create(summary: Summary): Promise<Summary>
  update(summary: Summary): Promise<Summary>
  deleteById(id: string): Promise<void>
  deleteByIds(ids: string[]): Promise<void>
}
