import type { CharacterRepository } from "../../../domain/ports/character.repository"
import { CharacterNotFoundError } from "../../../domain/errors"
import type { CharacterAssetWriter } from "../../services/store-character-asset.service"

export interface UploadCharacterAssetInput {
  characterId: string
  mimeType: string
  sizeBytes: number
  data: Buffer
}

export interface UploadCharacterAssetResult {
  assetId: string
  characterId: string
  mimeType: string
  sizeBytes: number
}

export class UploadCharacterAssetUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly storeCharacterAsset: CharacterAssetWriter,
  ) {}

  async execute(input: UploadCharacterAssetInput): Promise<UploadCharacterAssetResult> {
    const character = await this.characterRepository.findById(input.characterId)
    if (!character) {
      throw new CharacterNotFoundError(input.characterId)
    }

    const asset = await this.storeCharacterAsset.store({
      characterId: input.characterId,
      mimeType: input.mimeType,
      data: input.data,
    })

    return {
      assetId: asset.id,
      characterId: asset.characterId,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
    }
  }
}
