import type {
  SillyTavernCardFormat,
  SillyTavernCardPreview,
  SillyTavernCardWarning,
} from "@workspace/shared/types/sillytavern-card"
import { validateCardFieldSize } from "@workspace/shared/lib/sillytavern-card"

import { DomainError } from "../../../domain/errors"
import type { CardPngPort } from "../../../domain/ports/card-png.port"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"

import {
  cardDataToVersionFields,
  collectCardWarnings,
} from "./sillytavern-card.mapper"
import { decodeCardPayload } from "./sillytavern-card.payload"

export interface PreviewSillyTavernCardDeps {
  characterRepository: CharacterRepository
  lorebookRepository: LorebookRepository
  cardPng: CardPngPort
}

export interface PreviewSillyTavernCardInput {
  format: SillyTavernCardFormat
  payload: string
}

export class PreviewSillyTavernCardUseCase {
  constructor(private readonly deps: PreviewSillyTavernCardDeps) {}

  async execute(
    input: PreviewSillyTavernCardInput,
  ): Promise<SillyTavernCardPreview> {
    const decoded = decodeCardPayload(input, this.deps.cardPng)
    const fields = cardDataToVersionFields(decoded.data, decoded.root)

    const size = validateCardFieldSize(decoded.data)
    if (!size.ok) {
      throw new DomainError(
        "INVALID_CARD_FIELD_TOO_LARGE",
        `The card field '${size.field}' exceeds the allowed size.`,
        413,
      )
    }

    const warnings = new Set<SillyTavernCardWarning>(fields.warnings)
    if (decoded.cardVersion === "v1") warnings.add("V1_CARD")
    if (input.format === "json" || !decoded.imageBuffer) {
      warnings.add("IMAGE_ABSENT")
    }
    for (const warning of collectCardWarnings(decoded.data)) {
      warnings.add(warning)
    }
    if (fields.unknownFields) warnings.add("UNSUPPORTED_FIELDS_PRESERVED")

    return {
      name: fields.name,
      description: fields.description,
      tags: fields.tags,
      creator: fields.creator,
      lorebookEntryCount: fields.lorebook?.entries.length ?? 0,
      cardVersion: decoded.cardVersion,
      warnings: [...warnings],
    }
  }
}
