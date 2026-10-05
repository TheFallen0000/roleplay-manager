import sharp, { type Metadata } from "sharp"

import {
  CHARACTER_ASSET_VARIANTS,
  CHARACTER_ASSET_VARIANT_WIDTHS,
} from "@workspace/shared/types/image"

import { CharacterAssetValidationError } from "../../../../domain/errors"
import type {
  CharacterAssetImageProcessor,
  ProcessedCharacterAssetImage,
} from "../../../../domain/ports/character-asset-image-processor"

const MIME_FORMATS: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

export const DEFAULT_MAX_IMAGE_PIXELS = 40_000_000

export class SharpCharacterAssetImageProcessor
  implements CharacterAssetImageProcessor
{
  constructor(
    private readonly maxInputPixels = DEFAULT_MAX_IMAGE_PIXELS,
  ) {}

  async process(
    data: Buffer,
    mimeType: string,
  ): Promise<ProcessedCharacterAssetImage> {
    const metadata = await this.readMetadata(data, mimeType)
    const { width, height } = getDisplayDimensions(metadata)

    if (metadata.format === "gif") {
      return { width, height, variants: [] }
    }

    const variants: ProcessedCharacterAssetImage["variants"] = []
    const seenWidths = new Set<number>()

    for (const variant of CHARACTER_ASSET_VARIANTS) {
      const targetWidth = Math.min(
        width,
        CHARACTER_ASSET_VARIANT_WIDTHS[variant],
      )
      if (seenWidths.has(targetWidth)) continue
      seenWidths.add(targetWidth)

      try {
        const result = await sharp(data, {
          failOn: "error",
          limitInputPixels: this.maxInputPixels,
        })
          .rotate()
          .resize({ width: targetWidth, withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer({ resolveWithObject: true })

        variants.push({
          variant,
          width: result.info.width,
          height: result.info.height,
          data: result.data,
        })
      } catch (error) {
        throw toValidationError(error)
      }
    }

    return { width, height, variants }
  }

  private async readMetadata(data: Buffer, mimeType: string) {
    let metadata: Metadata
    try {
      metadata = await sharp(data, {
        failOn: "error",
        limitInputPixels: this.maxInputPixels,
      }).metadata()
    } catch (error) {
      throw toValidationError(error)
    }

    const expectedFormat = MIME_FORMATS[mimeType]
    if (!expectedFormat || metadata.format !== expectedFormat) {
      throw new CharacterAssetValidationError(
        `Image content does not match mime type '${mimeType}'`,
      )
    }

    if (!metadata.width || !metadata.height) {
      throw new CharacterAssetValidationError(
        "Image dimensions could not be determined",
      )
    }

    if (metadata.width * metadata.height > this.maxInputPixels) {
      throw new CharacterAssetValidationError(
        `Image dimensions exceed the ${this.maxInputPixels} pixel limit`,
      )
    }

    return metadata
  }
}

function getDisplayDimensions(metadata: Metadata): {
  width: number
  height: number
} {
  const swapsAxes = metadata.orientation !== undefined && metadata.orientation >= 5 && metadata.orientation <= 8
  return swapsAxes
    ? { width: metadata.height!, height: metadata.width! }
    : { width: metadata.width!, height: metadata.height! }
}

function toValidationError(error: unknown): CharacterAssetValidationError {
  return new CharacterAssetValidationError(
    error instanceof Error ? error.message : "Image could not be processed",
  )
}
