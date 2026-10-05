import type { CharacterSummary } from "@workspace/shared/types/character"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"

export class ListCharactersUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly assetRepository: CharacterAssetRepository,
  ) {}

  async execute(): Promise<CharacterSummary[]> {
    const characters = await this.characterRepository.list()
    const summaries: CharacterSummary[] = []

    for (const character of characters) {
      const result = await this.characterRepository.findById(character.id)
      if (result) {
        const profileImageAssetId = result.currentVersion.profileImageAssetId
        const profileImage = profileImageAssetId
          ? await this.assetRepository.findById(profileImageAssetId)
          : null
        summaries.push({
          id: character.id,
          name: character.name,
          subtitle: result.currentVersion.subtitle,
          profileImageAssetId,
          profileImageDimensions:
            profileImage?.width && profileImage.height
              ? { width: profileImage.width, height: profileImage.height }
              : null,
          profileImageMimeType: profileImage?.mimeType ?? null,
          versionNumber: result.currentVersion.versionNumber,
          createdAt: character.createdAt.toISOString(),
          updatedAt: character.updatedAt.toISOString(),
        })
      }
    }

    return summaries
  }
}
