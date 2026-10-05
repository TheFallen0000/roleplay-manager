import type { Readable } from "node:stream"

import type {
  CharacterAssetRepository,
  CharacterAssetVariantStorage,
} from "../../../domain/ports/character-asset.repository"
import {
  CHARACTER_ASSET_VARIANTS,
  type CharacterAssetVariant,
} from "@workspace/shared/types/image"
import { CharacterAssetNotFoundError } from "../../../domain/errors"

export interface GetCharacterAssetInput {
  assetId: string
  variant?: CharacterAssetVariant
}

export interface GetCharacterAssetResult {
  asset: {
    id: string
    characterId: string
    mimeType: string
    sizeBytes: number
  }
  stream: Readable
  isVariant: boolean
}

export class GetCharacterAssetUseCase {
  constructor(
    private readonly assetRepository: CharacterAssetRepository,
    private readonly assetStorage: CharacterAssetVariantStorage,
  ) {}

  async execute(input: GetCharacterAssetInput): Promise<GetCharacterAssetResult> {
    const asset = await this.assetRepository.findById(input.assetId)
    if (!asset) {
      throw new CharacterAssetNotFoundError(input.assetId)
    }

    if (input.variant) {
      const requestedIndex = CHARACTER_ASSET_VARIANTS.indexOf(input.variant)
      for (let index = requestedIndex; index >= 0; index -= 1) {
        const variantStream = await this.assetStorage.readVariant(
          asset.characterId,
          asset.id,
          CHARACTER_ASSET_VARIANTS[index],
        )
        if (variantStream) {
          return {
            asset: {
              id: asset.id,
              characterId: asset.characterId,
              mimeType: asset.mimeType,
              sizeBytes: asset.sizeBytes,
            },
            stream: variantStream,
            isVariant: true,
          }
        }
      }
    }

    const stream = await this.assetStorage.read(
      asset.characterId,
      asset.id,
      asset.extension,
    )

    return {
      asset: {
        id: asset.id,
        characterId: asset.characterId,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
      stream,
      isVariant: false,
    }
  }
}
