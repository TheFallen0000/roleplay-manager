import type { LorebookSummaryDTO } from "@workspace/shared/types/lorebook"

import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

export interface ListLorebooksDeps {
  lorebookRepository: LorebookRepository
}

export interface ListLorebooksInput {
  limit?: number
  offset?: number
}

export class ListLorebooksUseCase {
  constructor(private readonly deps: ListLorebooksDeps) {}

  async execute(
    input: ListLorebooksInput = {},
  ): Promise<LorebookSummaryDTO[]> {
    const summaries = await this.deps.lorebookRepository.listSummaries()
    const offset = input.offset ?? 0
    const end = input.limit === undefined ? undefined : offset + input.limit

    return summaries.slice(offset, end).map((summary) => ({
      id: summary.book.id,
      name: summary.book.name,
      description: summary.description,
      currentVersionNumber: summary.currentVersionNumber,
      entryCount: summary.entryCount,
      originId: summary.book.originId,
      usageCount: summary.usageCount,
      updatedAt: summary.book.updatedAt.toISOString(),
    }))
  }
}
