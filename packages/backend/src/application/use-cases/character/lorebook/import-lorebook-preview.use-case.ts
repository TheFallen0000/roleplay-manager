import type {
  ImportLorebookAction,
  ImportLorebookPreview,
  LorebookImportFormat,
} from "@workspace/shared/types/lorebook"

import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import {
  parseLorebookImport,
  resolveLorebookMatch,
  type LorebookMatchKind,
} from "./lorebook-import-matching"

export interface ImportLorebookPreviewDeps {
  lorebookRepository: LorebookRepository
}

export interface ImportLorebookPreviewInput {
  format: LorebookImportFormat
  payload: string
}

const suggestedAction = (kind: LorebookMatchKind): ImportLorebookAction => {
  switch (kind) {
    case "live-identical":
      return "reuse"
    case "deleted-identical":
      return "restore"
    case "live-different":
      return "new-version"
    default:
      return "new-book"
  }
}

export class ImportLorebookPreviewUseCase {
  constructor(private readonly deps: ImportLorebookPreviewDeps) {}

  async execute(
    input: ImportLorebookPreviewInput,
  ): Promise<ImportLorebookPreview> {
    const parsed = parseLorebookImport(input.payload)
    const match = await resolveLorebookMatch(
      this.deps.lorebookRepository,
      parsed.sourceKey,
      parsed.originId,
    )

    if (!match.book) {
      return { matched: false, suggestedAction: "new-book" }
    }

    const usage = await this.deps.lorebookRepository.findUsageVersions(
      match.book.id,
    )
    const usedByCharacters = new Set(
      usage.map((row) => row.characterId),
    ).size

    return {
      matched: true,
      suggestedAction: suggestedAction(match.kind),
      book: {
        id: match.book.id,
        name: match.book.name,
        deleted: match.book.deletedAt !== null,
        matchedVersionNumber: match.matchedVersionNumber,
        usedByCharacters,
      },
    }
  }
}
