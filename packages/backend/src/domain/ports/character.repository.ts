import type { Character } from "../entities/character.entity"
import type { CharacterVersion } from "../entities/character-version.entity"
import type { Lorebook } from "../entities/lorebook.entity"
import type { LorebookEntry } from "../entities/lorebook-entry.entity"

export interface CreateCharacterWithVersionResult {
  character: Character
  version: CharacterVersion
}

export interface CreateCharacterLorebook {
  book: Lorebook
  entries: LorebookEntry[]
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

export interface CharacterSummaryPageOptions {
  limit: number
  offset: number
}

export interface CharacterSummaryPage {
  entries: CharacterWithCurrentVersionSummary[]
  hasMore: boolean
  nextOffset: number | null
}

export interface CharacterSummaryRepository {
  listCurrentVersionSummaries(): Promise<CharacterWithCurrentVersionSummary[]>

  listCurrentVersionSummariesPage(
    options: CharacterSummaryPageOptions,
  ): Promise<CharacterSummaryPage>

  findCurrentVersionSummaryByCharacterId(
    characterId: string,
  ): Promise<CharacterVersionSummary | null>

  findVersionSummariesByIds(
    ids: string[],
  ): Promise<CharacterVersionSummary[]>
}

export interface CharacterRepository {
  createWithFirstVersion(
    character: Character,
    version: CharacterVersion,
    lorebook?: CreateCharacterLorebook,
  ): Promise<CreateCharacterWithVersionResult>

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
