import type { LorebookEntry } from "../entities/lorebook-entry.entity"
import type { Lorebook } from "../entities/lorebook.entity"
import type { LorebookVersion } from "../entities/lorebook-version.entity"

export interface LorebookWithEntries {
  book: Lorebook
  entries: LorebookEntry[]
}

export interface LorebookSummary {
  book: Lorebook
  currentVersionNumber: number | null
  entryCount: number
  description: string | null
  usageCount: number
  usageVersionCount: number
}

export interface CreateContainerWithVersionResult {
  book: Lorebook
  entries: LorebookEntry[]
  version: LorebookVersion
}

export interface SaveLiveHeadResult {
  book: Lorebook
  entries: LorebookEntry[]
  version?: LorebookVersion
  createdNewVersion: boolean
}

export interface LorebookUsageRow {
  characterVersionId: string
  characterVersionNumber: number
  characterId: string
  characterName: string
  lorebookVersionNumber: number
}

export interface CharacterVersionNumber {
  characterId: string
  versionNumber: number
}

export interface LorebookRepository {
  findByCharacterId(
    characterId: string,
  ): Promise<LorebookWithEntries | null>

  findById(id: string): Promise<LorebookWithEntries | null>

  list(): Promise<Lorebook[]>

  listSummaries(input?: {
    limit?: number
    offset?: number
    filter?: "all" | "in-use" | "unused"
  }): Promise<LorebookSummary[]>

  findVersions(lorebookId: string): Promise<LorebookVersion[]>

  findVersionById(versionId: string): Promise<LorebookVersion | null>

  /** Batch lookup; an empty input returns `[]`. */
  findVersionsByIds(ids: string[]): Promise<LorebookVersion[]>

  /** Batch lookup of containers only; an empty input returns `[]`. */
  findByIds(ids: string[]): Promise<Lorebook[]>

  /** Includes soft-deleted containers: import matching classifies them. */
  findBooksByOriginId(originId: string): Promise<Lorebook[]>

  /** Includes versions of soft-deleted containers: import matching classifies them. */
  findVersionsBySourceKey(sourceKey: string): Promise<LorebookVersion[]>

  upsertBook(book: Lorebook): Promise<Lorebook>

  createContainerWithVersion(
    book: Lorebook,
    entries: LorebookEntry[],
    version: LorebookVersion,
  ): Promise<CreateContainerWithVersionResult>

  saveLiveHeadAndVersion(
    book: Lorebook,
    entries: LorebookEntry[],
    version?: LorebookVersion,
  ): Promise<SaveLiveHeadResult>

  restoreVersionAsNewHead(
    book: Lorebook,
    entries: LorebookEntry[],
    sourceVersion: LorebookVersion,
  ): Promise<SaveLiveHeadResult>

  softDelete(id: string): Promise<void>

  /** Clears `deleted_at`; it does not create a version. */
  restoreBook(id: string): Promise<void>

  findUsageVersions(lorebookId: string): Promise<LorebookUsageRow[]>

  findCurrentCharacterVersionNumbers(
    characterIds: string[],
  ): Promise<CharacterVersionNumber[]>

  createEntry(entry: LorebookEntry): Promise<LorebookEntry>

  updateEntry(entry: LorebookEntry): Promise<LorebookEntry>

  deleteEntry(entryId: string): Promise<void>

  reorderEntries(entryIds: string[]): Promise<void>

  replaceBook(book: Lorebook, entries: LorebookEntry[]): Promise<void>
}
