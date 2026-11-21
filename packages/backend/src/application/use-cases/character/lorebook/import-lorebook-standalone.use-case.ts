import { v7 as randomUUIDv7 } from "uuid"

import type {
  ImportLorebookAction,
  ImportLorebookResult,
  LorebookImportFormat,
} from "@workspace/shared/types/lorebook"

import { LorebookVersion } from "../../../../domain/entities/lorebook-version.entity"
import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import {
  buildLorebookEntities,
  isRecord,
  serializeLorebookEntries,
  toLorebookCanonicalContent,
  toLorebookDTO,
} from "./lorebook.mapper"
import {
  assertActionMatches,
  parseLorebookImport,
  resolveLorebookMatch,
  type LorebookMatchKind,
  type ParsedLorebookImport,
} from "./lorebook-import-matching"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "./source-key"

export interface ImportLorebookStandaloneDeps {
  lorebookRepository: LorebookRepository
}

export interface ImportLorebookStandaloneInput {
  format: LorebookImportFormat
  payload: string
  action: ImportLorebookAction
}

export class ImportLorebookStandaloneUseCase {
  constructor(private readonly deps: ImportLorebookStandaloneDeps) {}

  async execute(
    input: ImportLorebookStandaloneInput,
  ): Promise<ImportLorebookResult> {
    const parsed = parseLorebookImport(input.payload)
    const match = await resolveLorebookMatch(
      this.deps.lorebookRepository,
      parsed.sourceKey,
      parsed.originId,
    )
    assertActionMatches(input.action, match.kind)

    if (input.action === "reuse") {
      return this.reuse(match.book?.id, match.matchedVersionNumber)
    }

    if (input.action === "restore") {
      return this.restore(match.book?.id, match.matchedVersionNumber)
    }

    if (input.action === "new-version") {
      return this.createVersion(
        parsed,
        match.book?.id,
        match.matchedVersionNumber,
      )
    }

    return this.createBook(parsed, match.kind)
  }

  private async reuse(
    bookId: string | undefined,
    matchedVersionNumber: number | null,
  ): Promise<ImportLorebookResult> {
    const found = bookId
      ? await this.deps.lorebookRepository.findById(bookId)
      : null
    if (!found) throw this.missingBook(bookId)

    return {
      action: "reuse",
      lorebook: toLorebookDTO(
        found.book,
        found.entries,
        await this.currentVersionNumber(found.book.currentVersionId),
      ),
      matchedVersionNumber,
    }
  }

  private async restore(
    bookId: string | undefined,
    matchedVersionNumber: number | null,
  ): Promise<ImportLorebookResult> {
    if (!bookId) throw this.missingBook(bookId)

    await this.deps.lorebookRepository.restoreBook(bookId)
    const found = await this.deps.lorebookRepository.findById(bookId)
    if (!found) throw this.missingBook(bookId)

    return {
      action: "restore",
      lorebook: toLorebookDTO(
        found.book,
        found.entries,
        await this.currentVersionNumber(found.book.currentVersionId),
      ),
      matchedVersionNumber,
    }
  }

  private async createVersion(
    parsed: ParsedLorebookImport,
    bookId: string | undefined,
    matchedVersionNumber: number | null,
  ): Promise<ImportLorebookResult> {
    if (!bookId) throw this.missingBook(bookId)

    const existing = await this.deps.lorebookRepository.findById(bookId)
    if (!existing) throw this.missingBook(bookId)

    const entities = buildLorebookEntities(parsed.root, null, { bookId })
    if (!entities) throw this.missingBook(bookId)

    const book = entities.book.withOriginId(existing.book.originId)
    const saved = await this.deps.lorebookRepository.saveLiveHeadAndVersion(
      book,
      entities.entries,
    )

    return {
      action: "new-version",
      lorebook: toLorebookDTO(
        saved.book,
        saved.entries,
        saved.version?.versionNumber ?? null,
      ),
      matchedVersionNumber,
    }
  }

  private async createBook(
    parsed: ParsedLorebookImport,
    kind: LorebookMatchKind,
  ): Promise<ImportLorebookResult> {
    const freshOrigin = kind === "deleted-different"
    const originId = freshOrigin ? randomUUIDv7() : parsed.originId
    const baseBook = parsed.entities.book.withOriginId(originId)
    const extensions = isRecord(baseBook.extensions)
      ? baseBook.extensions
      : {}
    const rm = isRecord(extensions.rm) ? extensions.rm : {}
    const book = freshOrigin
      ? baseBook.withSettings({
          extensions: {
            ...extensions,
            rm: { ...rm, originId },
          },
        })
      : baseBook
    const entries = parsed.entities.entries

    const version = LorebookVersion.create({
      id: randomUUIDv7(),
      lorebookId: book.id,
      versionNumber: 1,
      name: book.name,
      description: book.description,
      scanDepth: book.scanDepth,
      tokenBudget: book.tokenBudget,
      recursiveScanning: book.recursiveScanning,
      entriesJson: serializeLorebookEntries(entries),
      sourceKey: computeLorebookSourceKey(
        canonicalizeLorebookContent(toLorebookCanonicalContent(book, entries)),
      ),
    })

    const saved = await this.deps.lorebookRepository.createContainerWithVersion(
      book,
      entries,
      version,
    )

    return {
      action: "new-book",
      lorebook: toLorebookDTO(
        saved.book,
        saved.entries,
        saved.version.versionNumber,
      ),
      matchedVersionNumber: null,
    }
  }

  private async currentVersionNumber(
    versionId: string | null,
  ): Promise<number | null> {
    if (!versionId) return null
    const version = await this.deps.lorebookRepository.findVersionById(versionId)
    return version?.versionNumber ?? null
  }

  private missingBook(bookId: string | undefined): DomainError {
    return new DomainError(
      "LOREBOOK_NOT_FOUND",
      `Lorebook with id '${bookId ?? ""}' not found.`,
      404,
    )
  }
}
