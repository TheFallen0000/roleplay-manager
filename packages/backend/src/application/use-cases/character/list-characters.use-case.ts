import type { CharacterSummary } from "@workspace/shared/types/character"

import type { CharacterSummaryRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetLookupRepository } from "../../../domain/ports/character-asset.repository"

export class ListCharactersUseCase {
  constructor(
    private readonly characterRepository: CharacterSummaryRepository,
    private readonly assetRepository: CharacterAssetLookupRepository,
  ) {}

  async execute(): Promise<CharacterSummary[]> {
    const entries = await this.characterRepository.listCurrentVersionSummaries()
    const assetIds = entries
      .map(({ currentVersion }) => currentVersion.profileImageAssetId)
      .filter((id): id is string => Boolean(id))
    const assets = await this.assetRepository.findByIds(assetIds)
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]))

    return entries.map(({ character, currentVersion }) => {
      const profileImage = currentVersion.profileImageAssetId
        ? assetsById.get(currentVersion.profileImageAssetId) ?? null
        : null

      return {
        id: character.id,
        name: character.name,
        subtitle: currentVersion.subtitle,
        profileImageAssetId: currentVersion.profileImageAssetId,
        profileImageDimensions:
          profileImage?.width && profileImage.height
            ? { width: profileImage.width, height: profileImage.height }
            : null,
        profileImageMimeType: profileImage?.mimeType ?? null,
        versionNumber: currentVersion.versionNumber,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      }
    })
  }
}
