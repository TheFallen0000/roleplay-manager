import type { Character } from "../entities/character.entity"
import type { CharacterVersion } from "../entities/character-version.entity"

export interface CreateCharacterWithVersionResult {
  character: Character
  version: CharacterVersion
}

export interface CharacterVersionSummary {
  id: string
  characterId: string
  name: string
  subtitle: string | null
  profileImageAssetId: string | null
  versionNumber: number
}

export interface CharacterWithCurrentVersionSummary {
  character: Character
  currentVersion: CharacterVersionSummary
}

export interface CharacterSummaryRepository {
  listCurrentVersionSummaries(): Promise<CharacterWithCurrentVersionSummary[]>

  findCurrentVersionSummaryByCharacterId(
    characterId: string,
  ): Promise<CharacterVersionSummary | null>

  findVersionSummariesByIds(
    ids: string[],
  ): Promise<CharacterVersionSummary[]>
}

export interface CharacterRepository {
  createWithFirstVersion(character: Character, version: CharacterVersion): Promise<CreateCharacterWithVersionResult>

  findById(id: string): Promise<{ character: Character; currentVersion: CharacterVersion } | null>

  list(): Promise<Character[]>

  update(character: Character): Promise<Character>

  delete(id: string): Promise<void>

  findVersionById(id: string): Promise<CharacterVersion | null>

  findVersionsByCharacterId(characterId: string): Promise<CharacterVersion[]>

  findMaxVersionNumber(characterId: string): Promise<number>

  saveVersion(version: CharacterVersion): Promise<CharacterVersion>

  updateProfileImageAssetId(
    versionId: string,
    profileImageAssetId: string | null,
  ): Promise<void>
}
