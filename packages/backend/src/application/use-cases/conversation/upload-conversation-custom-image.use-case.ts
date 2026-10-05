import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import {
  ConversationNotFoundError,
} from "../../../domain/errors"
import type { CharacterAssetWriter } from "../../services/store-character-asset.service"

export interface UploadConversationCustomImageInput {
  conversationId: string
  mimeType: string
  sizeBytes: number
  data: Buffer
}

export interface UploadConversationCustomImageResult {
  assetId: string
  characterId: string
  mimeType: string
  sizeBytes: number
}

export class UploadConversationCustomImageUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly storeCharacterAsset: CharacterAssetWriter,
  ) {}

  async execute(
    input: UploadConversationCustomImageInput,
  ): Promise<UploadConversationCustomImageResult> {
    const conv = await this.conversationRepository.findById(input.conversationId)
    if (!conv) {
      throw new ConversationNotFoundError(input.conversationId)
    }

    const version = await this.characterRepository.findVersionById(conv.versionId)
    const characterId = version?.characterId
    if (!characterId) {
      throw new ConversationNotFoundError(input.conversationId)
    }

    const asset = await this.storeCharacterAsset.store({
      characterId,
      mimeType: input.mimeType,
      data: input.data,
    })

    return {
      assetId: asset.id,
      characterId,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
    }
  }
}
