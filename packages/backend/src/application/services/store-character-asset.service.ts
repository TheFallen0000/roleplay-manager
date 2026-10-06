import { v7 as randomUUIDv7 } from "uuid"

import { isAllowedImageMime, mimeToExtension } from "@workspace/shared/lib/image"
import {
  CHARACTER_ASSET_VARIANTS_BY_USAGE,
  type CharacterAssetUsage,
} from "@workspace/shared/types/image"

import { CharacterAssetValidationError } from "../../domain/errors"
import type {
  CharacterAssetRepository,
  CharacterAssetMetadata,
  CharacterAssetVariantStorage,
} from "../../domain/ports/character-asset.repository"
import type { CharacterAssetImageProcessor } from "../../domain/ports/character-asset-image-processor"
import { ImageMetadata } from "../../domain/value-objects/image-metadata"

export interface StoreCharacterAssetInput {
  characterId: string
  mimeType: string
  data: Buffer
  createdAt?: Date
  /** Decides which variant set is generated (defaults to `profile`). */
  usage?: CharacterAssetUsage
}

export interface CharacterAssetWriter {
  store(input: StoreCharacterAssetInput): Promise<CharacterAssetMetadata>
}

export class StoreCharacterAssetService {
  constructor(
    private readonly assetRepository: CharacterAssetRepository,
    private readonly assetStorage: CharacterAssetVariantStorage,
    private readonly imageProcessor: CharacterAssetImageProcessor,
    private readonly maxBytes: number,
  ) {}

  async store(input: StoreCharacterAssetInput): Promise<CharacterAssetMetadata> {
    if (!isAllowedImageMime(input.mimeType)) {
      throw new CharacterAssetValidationError(
        `Mime type '${input.mimeType}' is not allowed. Allowed: png, jpeg, webp, gif`,
      )
    }
    const extension = mimeToExtension(input.mimeType)
    if (!extension) {
      throw new CharacterAssetValidationError(
        `Cannot determine extension for mime '${input.mimeType}'`,
      )
    }

    const imageMetadata = ImageMetadata.create(
      input.mimeType,
      extension,
      input.data,
      this.maxBytes,
    )
    const processed = await this.imageProcessor.process(
      input.data,
      imageMetadata.mime,
      { variants: CHARACTER_ASSET_VARIANTS_BY_USAGE[input.usage ?? "profile"] },
    )
    const assetId = randomUUIDv7()
    const metadata = {
      id: assetId,
      characterId: input.characterId,
      mimeType: imageMetadata.mime,
      sizeBytes: imageMetadata.sizeBytes,
      extension: imageMetadata.extension,
      width: processed.width,
      height: processed.height,
      createdAt: input.createdAt ?? new Date(),
    }

    try {
      await this.assetStorage.write(
        input.characterId,
        assetId,
        imageMetadata.extension,
        input.data,
      )
      for (const variant of processed.variants) {
        await this.assetStorage.writeVariant(
          input.characterId,
          assetId,
          variant.variant,
          variant.data,
        )
      }
      await this.assetRepository.create(metadata)
    } catch (error) {
      await this.assetStorage
        .delete(input.characterId, assetId, imageMetadata.extension)
        .catch(() => undefined)
      throw error
    }

    return metadata
  }
}
