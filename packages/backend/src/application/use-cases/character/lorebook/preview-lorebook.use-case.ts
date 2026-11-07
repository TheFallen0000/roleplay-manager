import type {
  LorebookPreview,
  SillyTavernCardWarning,
} from "@workspace/shared/types/sillytavern-card"
import { detectSillyTavernShape } from "@workspace/shared/lib/sillytavern-card"

import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { collectCardWarnings } from "../sillytavern-card.mapper"
import { isRecord, normalizeLorebook } from "./lorebook.mapper"

export interface PreviewLorebookDeps {
  lorebookRepository: LorebookRepository
}

export interface PreviewLorebookInput {
  format: "json"
  payload: string
}

export class PreviewLorebookUseCase {
  constructor(_deps: PreviewLorebookDeps) {}

  async execute(input: PreviewLorebookInput): Promise<LorebookPreview> {
    let parsed: unknown
    try {
      parsed = JSON.parse(input.payload)
    } catch {
      throw new DomainError(
        "INVALID_CARD_JSON",
        "The lorebook payload is not valid JSON.",
        400,
      )
    }

    const shape = detectSillyTavernShape(parsed)
    let detectedShape: "ccv3" | "st-native"
    let source: Record<string, unknown>

    if (shape.shape === "lorebook_ccv3" && isRecord(parsed) && isRecord(parsed.data)) {
      detectedShape = "ccv3"
      source = parsed.data
    } else if (shape.shape === "lorebook_st_native" && isRecord(parsed)) {
      detectedShape = "st-native"
      source = parsed
    } else {
      throw new DomainError(
        "INVALID_CARD_JSON",
        "The payload is not a SillyTavern lorebook.",
        400,
      )
    }

    const normalized = normalizeLorebook(source)
    if (!normalized) {
      throw new DomainError(
        "INVALID_CARD_JSON",
        "The payload is not a SillyTavern lorebook.",
        400,
      )
    }

    const warnings = new Set<SillyTavernCardWarning>(
      collectCardWarnings(source),
    )
    if (normalized.unknownFields) {
      warnings.add("UNSUPPORTED_FIELDS_PRESERVED")
    }

    return {
      detectedShape,
      entryCount: normalized.entries.length,
      warnings: [...warnings],
    }
  }
}
