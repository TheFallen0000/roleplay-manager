import type { LorebookExportFormat } from "@workspace/shared/types/sillytavern-card"

import { DomainError } from "../../../../domain/errors"
import type {
  LorebookRepository,
  LorebookWithEntries,
} from "../../../../domain/ports/lorebook.repository"

import {
  isRecord,
  toCCv3Lorebook,
  toStNativeLorebook,
  type LorebookEntryLike,
  type LorebookLike,
} from "./lorebook.mapper"

export interface ExportLorebookDeps {
  lorebookRepository: LorebookRepository
}

export interface CCv3LorebookExport {
  spec: "lorebook_v3"
  data: Record<string, unknown>
}

export interface StNativeLorebookExport {
  entries: Record<string, Record<string, unknown>>
  extensions?: Record<string, unknown>
}

type JsonRecord = Record<string, unknown>

const mergeExtensions = (
  extensions: unknown,
  originId: string | null,
): JsonRecord => {
  const base = isRecord(extensions) ? extensions : {}
  const rm = isRecord(base.rm) ? base.rm : {}
  const existingOrigin =
    typeof rm.originId === "string" && rm.originId.length > 0
      ? rm.originId
      : null
  const resolvedOrigin = originId ?? existingOrigin

  return {
    ...base,
    rm: {
      ...rm,
      version: 1,
      ...(resolvedOrigin ? { originId: resolvedOrigin } : {}),
    },
  }
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
    versionId?: string
    format: LorebookExportFormat
  }): Promise<CCv3LorebookExport | StNativeLorebookExport> {
    const found = await this.deps.lorebookRepository.findById(input.lorebookId)
    if (!found || found.book.deletedAt) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The lorebook does not exist.",
        404,
      )
    }

    if (!input.versionId) {
      return this.toExport(found, input.format)
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

    const entries = JSON.parse(version.entriesJson) as LorebookEntryLike[]
    const book: LorebookLike = {
      name: version.name,
      description: version.description,
      scanDepth: version.scanDepth,
      tokenBudget: version.tokenBudget,
      recursiveScanning: version.recursiveScanning,
      extensions: mergeExtensions(found.book.extensions, found.book.originId),
      unknownFields: found.book.unknownFields,
    }

    return this.exportSource({ book, entries }, input.format)
  }

  private toExport(
    found: LorebookWithEntries,
    format: LorebookExportFormat,
  ): CCv3LorebookExport | StNativeLorebookExport {
    const source = {
      book: {
        name: found.book.name,
        description: found.book.description,
        scanDepth: found.book.scanDepth,
        tokenBudget: found.book.tokenBudget,
        recursiveScanning: found.book.recursiveScanning,
        extensions: mergeExtensions(
          found.book.extensions,
          found.book.originId,
        ),
        unknownFields: found.book.unknownFields,
      },
      entries: found.entries,
    }

    return this.exportSource(source, format)
  }

  private exportSource(
    source: { book: LorebookLike; entries: LorebookEntryLike[] },
    format: LorebookExportFormat,
  ): CCv3LorebookExport | StNativeLorebookExport {
    return format === "ccv3"
      ? (toCCv3Lorebook(source) as CCv3LorebookExport)
      : (toStNativeLorebook(source) as StNativeLorebookExport)
  }
}
