import type { LorebookExportFormat } from "@workspace/shared/types/sillytavern-card"

import { DomainError } from "../../../../domain/errors"
import type {
  LorebookRepository,
  LorebookWithEntries,
} from "../../../../domain/ports/lorebook.repository"

import { toCCv3Lorebook, toStNativeLorebook } from "./lorebook.mapper"

export interface ExportLorebookDeps {
  lorebookRepository: LorebookRepository
}

export interface CCv3LorebookExport {
  spec: "lorebook_v3"
  data: Record<string, unknown>
}

export interface StNativeLorebookExport {
  entries: Record<string, Record<string, unknown>>
}

export class ExportLorebookUseCase {
  constructor(private readonly deps: ExportLorebookDeps) {}

  async execute(input: {
    characterId: string
    format: "ccv3"
  }): Promise<CCv3LorebookExport>
  async execute(input: {
    characterId: string
    format: "st-native"
  }): Promise<StNativeLorebookExport>
  async execute(input: {
    characterId: string
    format: LorebookExportFormat
  }): Promise<CCv3LorebookExport | StNativeLorebookExport>
  async execute(input: {
    characterId: string
    format: LorebookExportFormat
  }): Promise<CCv3LorebookExport | StNativeLorebookExport> {
    const found = await this.deps.lorebookRepository.findByCharacterId(
      input.characterId,
    )
    if (!found) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The character does not have a lorebook.",
        404,
      )
    }

    return this.toExport(found, input.format)
  }

  async executeById(input: {
    lorebookId: string
    format: LorebookExportFormat
  }): Promise<CCv3LorebookExport | StNativeLorebookExport> {
    const found = await this.deps.lorebookRepository.findById(input.lorebookId)
    if (!found) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The lorebook does not exist.",
        404,
      )
    }

    return this.toExport(found, input.format)
  }

  private toExport(
    found: LorebookWithEntries,
    format: LorebookExportFormat,
  ): CCv3LorebookExport | StNativeLorebookExport {
    const source = { book: found.book, entries: found.entries }
    return format === "ccv3"
      ? toCCv3Lorebook(source)
      : toStNativeLorebook(source)
  }
}
