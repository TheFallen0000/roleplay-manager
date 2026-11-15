import type { CharacterDetail } from "@workspace/shared/types/character"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import {
  CharacterAssetNotFoundError,
  CharacterNotFoundError,
} from "../../../domain/errors"
import { toCharacterVersionDTO } from "./character-version.mapper"

export class UpdateCharacterProfileImageUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly assetRepository: CharacterAssetRepository,
  ) {}

  async execute(
    id: string,
    profileImageAssetId: string | null,
  ): Promise<CharacterDetail> {
    const existing = await this.characterRepository.findById(id)

    if (!existing) {
      throw new CharacterNotFoundError(id)
    }

    if (profileImageAssetId !== null) {
      const asset = await this.assetRepository.findById(profileImageAssetId)
      if (!asset) {
        throw new CharacterAssetNotFoundError(profileImageAssetId)
      }
    }

    await this.characterRepository.updateProfileImageAssetId(
      existing.currentVersion.id,
      profileImageAssetId,
    )

    const result = await this.characterRepository.findById(id)
    const allVersions = await this.characterRepository.findVersionsByCharacterId(id)
    const currentVersion = result?.currentVersion ?? existing.currentVersion

    return {
      id: existing.character.id,
      name: existing.character.name,
      createdAt: existing.character.createdAt.toISOString(),
      updatedAt: existing.character.updatedAt.toISOString(),
      currentVersion: toCharacterVersionDTO(currentVersion),
      versions: allVersions.map((version) => toCharacterVersionDTO(version)),
    }
  }
}
