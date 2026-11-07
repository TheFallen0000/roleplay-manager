import { eq } from "drizzle-orm"

import { LorebookEntry } from "../../../../../domain/entities/lorebook-entry.entity"
import { Lorebook } from "../../../../../domain/entities/lorebook.entity"
import type {
  LorebookRepository,
  LorebookWithEntries,
} from "../../../../../domain/ports/lorebook.repository"
import type { Database } from "../../../../config/database"
import { lorebookEntries, lorebooks } from "../schema"
import {
  parseJsonArray,
  parseJsonValue,
  serializeJsonValue,
} from "./json-column"

type BookRow = typeof lorebooks.$inferSelect
type EntryRow = typeof lorebookEntries.$inferSelect

const toBook = (row: BookRow): Lorebook =>
  Lorebook.reconstruct({
    id: row.id,
    characterId: row.characterId,
    name: row.name ?? null,
    description: row.description ?? null,
    scanDepth: row.scanDepth,
    tokenBudget: row.tokenBudget,
    recursiveScanning: row.recursiveScanning === 1,
    extensions: parseJsonValue(row.extensions),
    unknownFields: parseJsonValue(row.unknownFields),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  })

const toEntry = (row: EntryRow): LorebookEntry =>
  LorebookEntry.reconstruct({
    id: row.id,
    lorebookId: row.lorebookId,
    name: row.name ?? null,
    sourceId: row.sourceId ?? null,
    keys: parseJsonArray(row.keys),
    secondaryKeys: parseJsonArray(row.secondaryKeys),
    comment: row.comment ?? null,
    content: row.content,
    constant: row.constant === 1,
    selective: row.selective === 1,
    selectiveLogic: row.selectiveLogic as 0 | 1 | 2 | 3,
    insertionOrder: row.insertionOrder,
    position: row.position as "before_char" | "after_char",
    rawPosition: row.rawPosition ?? null,
    priority: row.priority,
    enabled: row.enabled === 1,
    caseSensitive: row.caseSensitive === 1,
    wholeWords: row.wholeWords === 1,
    order: row.order,
    extensions: parseJsonValue(row.extensions),
    unknownFields: parseJsonValue(row.unknownFields),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  })

export const bookValues = (book: Lorebook) => ({
  id: book.id,
  characterId: book.characterId,
  name: book.name,
  description: book.description,
  scanDepth: book.scanDepth,
  tokenBudget: book.tokenBudget,
  recursiveScanning: book.recursiveScanning ? 1 : 0,
  extensions: serializeJsonValue(book.extensions),
  unknownFields: serializeJsonValue(book.unknownFields),
  createdAt: book.createdAt,
  updatedAt: book.updatedAt,
})

const bookUpdateValues = (book: Lorebook) => ({
  name: book.name,
  description: book.description,
  scanDepth: book.scanDepth,
  tokenBudget: book.tokenBudget,
  recursiveScanning: book.recursiveScanning ? 1 : 0,
  extensions: serializeJsonValue(book.extensions),
  unknownFields: serializeJsonValue(book.unknownFields),
  updatedAt: book.updatedAt,
})

export const entryValues = (entry: LorebookEntry) => ({
  id: entry.id,
  lorebookId: entry.lorebookId,
  name: entry.name,
  sourceId: entry.sourceId,
  keys: serializeJsonValue(entry.keys) ?? "[]",
  secondaryKeys: serializeJsonValue(entry.secondaryKeys) ?? "[]",
  comment: entry.comment,
  content: entry.content,
  constant: entry.constant ? 1 : 0,
  selective: entry.selective ? 1 : 0,
  selectiveLogic: entry.selectiveLogic,
  insertionOrder: entry.insertionOrder,
  position: entry.position,
  rawPosition: entry.rawPosition,
  priority: entry.priority,
  enabled: entry.enabled ? 1 : 0,
  caseSensitive: entry.caseSensitive ? 1 : 0,
  wholeWords: entry.wholeWords ? 1 : 0,
  order: entry.order,
  extensions: serializeJsonValue(entry.extensions),
  unknownFields: serializeJsonValue(entry.unknownFields),
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
})

const entryUpdateValues = (entry: LorebookEntry) => ({
  name: entry.name,
  sourceId: entry.sourceId,
  keys: serializeJsonValue(entry.keys) ?? "[]",
  secondaryKeys: serializeJsonValue(entry.secondaryKeys) ?? "[]",
  comment: entry.comment,
  content: entry.content,
  constant: entry.constant ? 1 : 0,
  selective: entry.selective ? 1 : 0,
  selectiveLogic: entry.selectiveLogic,
  insertionOrder: entry.insertionOrder,
  position: entry.position,
  rawPosition: entry.rawPosition,
  priority: entry.priority,
  enabled: entry.enabled ? 1 : 0,
  caseSensitive: entry.caseSensitive ? 1 : 0,
  wholeWords: entry.wholeWords ? 1 : 0,
  order: entry.order,
  extensions: serializeJsonValue(entry.extensions),
  unknownFields: serializeJsonValue(entry.unknownFields),
  updatedAt: entry.updatedAt,
})

export class DrizzleLorebookRepository implements LorebookRepository {
  constructor(private readonly db: Database) {}

  async findByCharacterId(
    characterId: string,
  ): Promise<LorebookWithEntries | null> {
    const bookRows = await this.db
      .select()
      .from(lorebooks)
      .where(eq(lorebooks.characterId, characterId))
      .limit(1)

    if (bookRows.length === 0) return null

    const book = toBook(bookRows[0])
    const entryRows = await this.db
      .select()
      .from(lorebookEntries)
      .where(eq(lorebookEntries.lorebookId, book.id))
      .orderBy(lorebookEntries.order)

    return { book, entries: entryRows.map(toEntry) }
  }

  async upsertBook(book: Lorebook): Promise<Lorebook> {
    const existing = await this.db
      .select({ id: lorebooks.id })
      .from(lorebooks)
      .where(eq(lorebooks.characterId, book.characterId))
      .limit(1)

    if (existing.length > 0) {
      await this.db
        .update(lorebooks)
        .set(bookUpdateValues(book))
        .where(eq(lorebooks.characterId, book.characterId))
    } else {
      await this.db.insert(lorebooks).values(bookValues(book))
    }

    return book
  }

  async createEntry(entry: LorebookEntry): Promise<LorebookEntry> {
    await this.db.insert(lorebookEntries).values(entryValues(entry))
    return entry
  }

  async updateEntry(entry: LorebookEntry): Promise<LorebookEntry> {
    await this.db
      .update(lorebookEntries)
      .set(entryUpdateValues(entry))
      .where(eq(lorebookEntries.id, entry.id))
    return entry
  }

  async deleteEntry(entryId: string): Promise<void> {
    await this.db
      .delete(lorebookEntries)
      .where(eq(lorebookEntries.id, entryId))
  }

  async reorderEntries(entryIds: string[]): Promise<void> {
    this.db.transaction((tx) => {
      entryIds.forEach((entryId, index) => {
        tx.update(lorebookEntries)
          .set({ order: index, updatedAt: new Date() })
          .where(eq(lorebookEntries.id, entryId))
          .run()
      })
    })
  }

  async replaceBook(book: Lorebook, entries: LorebookEntry[]): Promise<void> {
    this.db.transaction((tx) => {
      const existing = tx
        .select({ id: lorebooks.id })
        .from(lorebooks)
        .where(eq(lorebooks.characterId, book.characterId))
        .limit(1)
        .all()

      if (existing.length === 0) {
        tx.insert(lorebooks).values(bookValues(book)).run()
      } else if (existing[0].id === book.id) {
        tx.update(lorebooks)
          .set(bookUpdateValues(book))
          .where(eq(lorebooks.id, book.id))
          .run()
        tx.delete(lorebookEntries)
          .where(eq(lorebookEntries.lorebookId, book.id))
          .run()
      } else {
        tx.delete(lorebooks).where(eq(lorebooks.id, existing[0].id)).run()
        tx.insert(lorebooks).values(bookValues(book)).run()
      }

      if (entries.length > 0) {
        tx.insert(lorebookEntries).values(entries.map(entryValues)).run()
      }
    })
  }
}
