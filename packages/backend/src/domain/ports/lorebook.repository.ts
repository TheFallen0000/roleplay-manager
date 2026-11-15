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

export interface LorebookRepository {
  findByCharacterId(
    characterId: string,
  ): Promise<LorebookWithEntries | null>

  findById(id: string): Promise<LorebookWithEntries | null>

  list(): Promise<Lorebook[]>

  listSummaries(): Promise<LorebookSummary[]>

  findVersions(lorebookId: string): Promise<LorebookVersion[]>

  findVersionById(versionId: string): Promise<LorebookVersion | null>

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

  createEntry(entry: LorebookEntry): Promise<LorebookEntry>

  updateEntry(entry: LorebookEntry): Promise<LorebookEntry>

  deleteEntry(entryId: string): Promise<void>

  reorderEntries(entryIds: string[]): Promise<void>

  replaceBook(book: Lorebook, entries: LorebookEntry[]): Promise<void>
}
