import type { SillyTavernCardFormat } from "@workspace/shared/types/sillytavern-card"

import { DomainError } from "../../../domain/errors"
import type { CardPngPort } from "../../../domain/ports/card-png.port"

import { parseCardRoot, type ParsedCardRoot } from "./sillytavern-card.mapper"

export interface DecodedCard extends ParsedCardRoot {
  imageBuffer: Buffer | null
}

const invalidJson = (message: string): never => {
  throw new DomainError("INVALID_CARD_JSON", message, 400)
}

const parseJson = (payload: string): unknown => {
  try {
    return JSON.parse(payload)
  } catch {
    return invalidJson("The card payload is not valid JSON.")
  }
}

/**
 * Turns the wire payload (`json` text or a base64 PNG) into the card root and,
 * for PNG, the embedded image bytes.
 */
export function decodeCardPayload(
  input: {
    format: SillyTavernCardFormat
    payload: string
  },
  cardPng: CardPngPort,
): DecodedCard {
  if (input.format === "png") {
    const { cardJson, imageBuffer } = cardPng.parse(
      Buffer.from(input.payload, "base64"),
    )
    return {
      ...parseCardRoot(parseJson(cardJson)),
      imageBuffer: imageBuffer ? Buffer.from(imageBuffer) : null,
    }
  }

  return { ...parseCardRoot(parseJson(input.payload)), imageBuffer: null }
}
