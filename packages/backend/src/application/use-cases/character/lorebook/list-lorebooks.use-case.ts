import type { LorebookSummaryDTO } from "@workspace/shared/types/lorebook"

import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

export interface ListLorebooksDeps {
  lorebookRepository: LorebookRepository
}

export interface ListLorebooksInput {
  limit?: number
  offset?: number
  filter?: "all" | "in-use" | "unused"
}

export class ListLorebooksUseCase {
  constructor(private readonly deps: ListLorebooksDeps) {}

  async execute(
    input: ListLorebooksInput = {},
  ): Promise<LorebookSummaryDTO[]> {
    const summaries = await this.deps.lorebookRepository.listSummaries({
      ...(input.limit === undefined ? {} : { limit: input.limit }),
      ...(input.offset === undefined ? {} : { offset: input.offset }),
      ...(input.filter === undefined ? {} : { filter: input.filter }),
    })

    return summaries.map((summary) => ({
      id: summary.book.id,
      name: summary.book.name,
      description: summary.description,
      currentVersionNumber: summary.currentVersionNumber,
      entryCount: summary.entryCount,
      originId: summary.book.originId,
      usageCount: summary.usageCount,
      usageVersionCount: summary.usageVersionCount,
      updatedAt: summary.book.updatedAt.toISOString(),
    }))
  }
}
