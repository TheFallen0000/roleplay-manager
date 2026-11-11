import type {
  LorebookDTO,
  LorebookExportFormat,
} from "@workspace/shared/types/sillytavern-card"
import { MAX_LOREBOOK_ENTRIES } from "@workspace/shared/lib/sillytavern-card"

import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import {
  assertLorebookEntryCount,
  buildLorebookEntities,
  normalizeLorebook,
  toLorebookDTO,
} from "./lorebook.mapper"

export interface ImportLorebookDeps {
  lorebookRepository: LorebookRepository
}

export interface ImportLorebookInput {
  characterId: string
  format: LorebookExportFormat | "json"
  payload: string
  replace?: boolean
}

const parsePayload = (payload: string): unknown => {
  try {
    return JSON.parse(payload)
  } catch {
    throw new DomainError(
      "INVALID_CARD_JSON",
      "The lorebook payload is not valid JSON.",
      400,
    )
  }
}

export class ImportLorebookUseCase {
  constructor(private readonly deps: ImportLorebookDeps) {}

  async execute(input: ImportLorebookInput): Promise<LorebookDTO> {
    const parsed = parsePayload(input.payload)
    const normalized = normalizeLorebook(parsed)
    if (!normalized) {
      throw new DomainError(
        "INVALID_CARD_JSON",
        "The payload is not a SillyTavern lorebook.",
        400,
      )
    }
    assertLorebookEntryCount(normalized, MAX_LOREBOOK_ENTRIES)

    const existing = await this.deps.lorebookRepository.findByCharacterId(
      input.characterId,
    )
    if (existing && !input.replace) {
      throw new DomainError(
        "LOREBOOK_ALREADY_EXISTS",
        "The character already has a lorebook.",
        409,
      )
    }

    const entities = buildLorebookEntities(parsed, input.characterId, {
      bookId: existing?.book.id,
    })
    if (!entities) {
      throw new DomainError(
        "INVALID_CARD_JSON",
        "The payload is not a SillyTavern lorebook.",
        400,
      )
    }

    await this.deps.lorebookRepository.replaceBook(
      entities.book,
      entities.entries,
    )

    return toLorebookDTO(entities.book, entities.entries)
  }
}
