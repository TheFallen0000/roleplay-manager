import type { LorebookEntry } from "../entities/lorebook-entry.entity"
import type { Lorebook } from "../entities/lorebook.entity"

export interface LorebookWithEntries {
  book: Lorebook
  entries: LorebookEntry[]
}

export interface LorebookRepository {
  findByCharacterId(
    characterId: string,
  ): Promise<LorebookWithEntries | null>

  upsertBook(book: Lorebook): Promise<Lorebook>

  createEntry(entry: LorebookEntry): Promise<LorebookEntry>

  updateEntry(entry: LorebookEntry): Promise<LorebookEntry>

  deleteEntry(entryId: string): Promise<void>

  reorderEntries(entryIds: string[]): Promise<void>

  replaceBook(book: Lorebook, entries: LorebookEntry[]): Promise<void>
}
