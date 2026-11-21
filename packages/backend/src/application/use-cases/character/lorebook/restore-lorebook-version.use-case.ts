import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import {
  deserializeLorebookEntries,
  toLorebookDTO,
} from "./lorebook.mapper"

export interface RestoreLorebookVersionDeps {
  lorebookRepository: LorebookRepository
}

export interface RestoreLorebookVersionInput {
  lorebookId: string
  versionId: string
}

export interface RestoreLorebookVersionResult {
  lorebook: LorebookDTO
  createdNewVersion: boolean
}

export class RestoreLorebookVersionUseCase {
  constructor(private readonly deps: RestoreLorebookVersionDeps) {}

  async execute(
    input: RestoreLorebookVersionInput,
  ): Promise<RestoreLorebookVersionResult> {
    const found = await this.deps.lorebookRepository.findById(input.lorebookId)
    if (!found || found.book.deletedAt !== null) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        `Lorebook with id '${input.lorebookId}' not found.`,
        404,
      )
    }

    const version = await this.deps.lorebookRepository.findVersionById(
      input.versionId,
    )
    if (!version || version.lorebookId !== found.book.id) {
      throw new DomainError(
        "LOREBOOK_VERSION_NOT_FOUND",
        `Lorebook version with id '${input.versionId}' not found.`,
        404,
      )
    }

    if (version.id === found.book.currentVersionId) {
      return {
        lorebook: toLorebookDTO(
          found.book,
          found.entries,
          version.versionNumber,
        ),
        createdNewVersion: false,
      }
    }

    const book = found.book.withSettings({
      name: version.name,
      description: version.description,
      scanDepth: version.scanDepth,
      tokenBudget: version.tokenBudget,
      recursiveScanning: version.recursiveScanning,
    })
    const entries = deserializeLorebookEntries(
      version.entriesJson,
      found.book.id,
    )

    const saved = await this.deps.lorebookRepository.restoreVersionAsNewHead(
      book,
      entries,
      version,
    )

    return {
      lorebook: toLorebookDTO(
        saved.book,
        saved.entries,
        saved.version?.versionNumber ?? null,
      ),
      createdNewVersion: saved.createdNewVersion,
    }
  }
}
