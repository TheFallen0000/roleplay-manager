import { desc, eq, isNull, sql } from "drizzle-orm"
import { v7 as randomUUIDv7 } from "uuid"

import { LorebookEntry } from "../../../../../domain/entities/lorebook-entry.entity"
import { Lorebook } from "../../../../../domain/entities/lorebook.entity"
import { LorebookVersion } from "../../../../../domain/entities/lorebook-version.entity"
import type {
  CreateContainerWithVersionResult,
  LorebookRepository,
  LorebookSummary,
  LorebookWithEntries,
  SaveLiveHeadResult,
} from "../../../../../domain/ports/lorebook.repository"
import type { LorebookCanonicalContent } from "../../../../../application/use-cases/character/lorebook/source-key"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "../../../../../application/use-cases/character/lorebook/source-key"
import type { Database } from "../../../../config/database"
import {
  characterVersions,
  lorebookEntries,
  lorebooks,
  lorebookVersions,
} from "../schema"
import {
  parseJsonArray,
  parseJsonValue,
  serializeJsonValue,
} from "./json-column"

type BookRow = typeof lorebooks.$inferSelect
type EntryRow = typeof lorebookEntries.$inferSelect
type VersionRow = typeof lorebookVersions.$inferSelect

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
    originId: row.originId ?? null,
    currentVersionId: row.currentVersionId ?? null,
    deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
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

const toVersion = (row: VersionRow): LorebookVersion =>
  LorebookVersion.reconstruct({
    id: row.id,
    lorebookId: row.lorebookId,
    versionNumber: row.versionNumber,
    name: row.name ?? null,
    description: row.description ?? null,
    scanDepth: row.scanDepth,
    tokenBudget: row.tokenBudget,
    recursiveScanning: row.recursiveScanning === 1,
    entriesJson: row.entriesJson,
    sourceKey: row.sourceKey,
    createdAt: new Date(row.createdAt),
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
  originId: book.originId,
  currentVersionId: book.currentVersionId,
  deletedAt: book.deletedAt,
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

const versionValues = (version: LorebookVersion) => ({
  id: version.id,
  lorebookId: version.lorebookId,
  versionNumber: version.versionNumber,
  name: version.name,
  description: version.description,
  scanDepth: version.scanDepth,
  tokenBudget: version.tokenBudget,
  recursiveScanning: version.recursiveScanning ? 1 : 0,
  entriesJson: version.entriesJson,
  sourceKey: version.sourceKey,
  createdAt: version.createdAt,
})

const snapshotEntry = (entry: LorebookEntry) => ({
  name: entry.name,
  sourceId: entry.sourceId,
  keys: entry.keys,
  secondaryKeys: entry.secondaryKeys,
  comment: entry.comment,
  content: entry.content,
  constant: entry.constant,
  selective: entry.selective,
  selectiveLogic: entry.selectiveLogic,
  insertionOrder: entry.insertionOrder,
  position: entry.position,
  rawPosition: entry.rawPosition,
  priority: entry.priority,
  enabled: entry.enabled,
  caseSensitive: entry.caseSensitive,
  wholeWords: entry.wholeWords,
  order: entry.order,
  extensions: entry.extensions,
  unknownFields: entry.unknownFields,
})

const presentationOrder = (
  entries: LorebookEntry[],
): LorebookEntry[] =>
  [...entries].sort(
    (left, right) =>
      left.order - right.order ||
      left.insertionOrder - right.insertionOrder,
  )

const canonicalContent = (
  book: Lorebook,
  entries: LorebookEntry[],
): LorebookCanonicalContent => ({
  name: book.name,
  description: book.description,
  scanDepth: book.scanDepth,
  tokenBudget: book.tokenBudget,
  recursiveScanning: book.recursiveScanning,
  entries: presentationOrder(entries).map(snapshotEntry),
})

const serializeEntries = (entries: LorebookEntry[]): string =>
  JSON.stringify(presentationOrder(entries).map(snapshotEntry))

const versionSnapshot = (
  book: Lorebook,
  entries: LorebookEntry[],
): { entriesJson: string; sourceKey: string } => ({
  entriesJson: serializeEntries(entries),
  sourceKey: computeLorebookSourceKey(
    canonicalizeLorebookContent(canonicalContent(book, entries)),
  ),
})

export class DrizzleLorebookRepository implements LorebookRepository {
  constructor(private readonly db: Database) {}

  async findByCharacterId(
    characterId: string,
  ): Promise<LorebookWithEntries | null> {
    const book =
      (await this.findBookByLegacyCharacterId(characterId)) ??
      (await this.findBookByCurrentCharacterVersion(characterId))

    if (!book) return null

    const entryRows = await this.db
      .select()
      .from(lorebookEntries)
      .where(eq(lorebookEntries.lorebookId, book.id))
      .orderBy(lorebookEntries.order)

    return { book, entries: entryRows.map(toEntry) }
  }

  private async findBookByLegacyCharacterId(
    characterId: string,
  ): Promise<Lorebook | null> {
    const rows = await this.db
      .select()
      .from(lorebooks)
      .where(eq(lorebooks.characterId, characterId))
      .limit(1)

    return rows.length > 0 ? toBook(rows[0]) : null
  }

  /**
   * S132 compatibility after the backfill clears `character_id`: resolve the
   * live head through the current character version's linked lorebook version.
   */
  private async findBookByCurrentCharacterVersion(
    characterId: string,
  ): Promise<Lorebook | null> {
    const currentVersion = await this.db
      .select({ lorebookVersionId: characterVersions.lorebookVersionId })
      .from(characterVersions)
      .where(eq(characterVersions.characterId, characterId))
      .orderBy(desc(characterVersions.versionNumber))
      .limit(1)

    const lorebookVersionId = currentVersion[0]?.lorebookVersionId
    if (!lorebookVersionId) return null

    const version = await this.db
      .select({ lorebookId: lorebookVersions.lorebookId })
      .from(lorebookVersions)
      .where(eq(lorebookVersions.id, lorebookVersionId))
      .limit(1)

    const lorebookId = version[0]?.lorebookId
    if (!lorebookId) return null

    const rows = await this.db
      .select()
      .from(lorebooks)
      .where(eq(lorebooks.id, lorebookId))
      .limit(1)

    return rows.length > 0 ? toBook(rows[0]) : null
  }

  async findById(id: string): Promise<LorebookWithEntries | null> {
    const bookRows = await this.db
      .select()
      .from(lorebooks)
      .where(eq(lorebooks.id, id))
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

  async list(): Promise<Lorebook[]> {
    const rows = await this.db
      .select()
      .from(lorebooks)
      .where(isNull(lorebooks.deletedAt))
      .orderBy(lorebooks.createdAt)

    return rows.map(toBook)
  }

  async listSummaries(): Promise<LorebookSummary[]> {
    const rows = await this.db
      .select({
        book: lorebooks,
        currentVersionNumber: lorebookVersions.versionNumber,
        entryCount: sql<number>`(
          SELECT COUNT(*) FROM ${lorebookEntries}
          WHERE ${lorebookEntries.lorebookId} = ${lorebooks.id}
        )`,
      })
      .from(lorebooks)
      .leftJoin(
        lorebookVersions,
        eq(lorebooks.currentVersionId, lorebookVersions.id),
      )
      .where(isNull(lorebooks.deletedAt))
      .orderBy(lorebooks.createdAt)

    return rows.map((row) => ({
      book: toBook(row.book),
      currentVersionNumber: row.currentVersionNumber ?? null,
      entryCount: Number(row.entryCount ?? 0),
    }))
  }

  async findVersions(lorebookId: string): Promise<LorebookVersion[]> {
    const rows = await this.db
      .select()
      .from(lorebookVersions)
      .where(eq(lorebookVersions.lorebookId, lorebookId))
      .orderBy(lorebookVersions.versionNumber)

    return rows.map(toVersion)
  }

  async findVersionById(versionId: string): Promise<LorebookVersion | null> {
    const rows = await this.db
      .select()
      .from(lorebookVersions)
      .where(eq(lorebookVersions.id, versionId))
      .limit(1)

    return rows.length > 0 ? toVersion(rows[0]) : null
  }

  async upsertBook(book: Lorebook): Promise<Lorebook> {
    const existing = await this.findExistingContainer(book)

    if (existing) {
      await this.db
        .update(lorebooks)
        .set(bookUpdateValues(book))
        .where(eq(lorebooks.id, existing.id))
    } else {
      await this.db.insert(lorebooks).values(bookValues(book))
    }

    return book
  }

  private async findExistingContainer(
    book: Lorebook,
  ): Promise<{ id: string } | null> {
    if (book.characterId !== null) {
      const byCharacter = await this.db
        .select({ id: lorebooks.id })
        .from(lorebooks)
        .where(eq(lorebooks.characterId, book.characterId))
        .limit(1)
      if (byCharacter.length > 0) return byCharacter[0]
    }

    const byId = await this.db
      .select({ id: lorebooks.id })
      .from(lorebooks)
      .where(eq(lorebooks.id, book.id))
      .limit(1)

    return byId[0] ?? null
  }

  async createContainerWithVersion(
    book: Lorebook,
    entries: LorebookEntry[],
    version: LorebookVersion,
  ): Promise<CreateContainerWithVersionResult> {
    const snapshot = versionSnapshot(book, entries)
    const savedVersion = LorebookVersion.create({
      id: version.id,
      lorebookId: book.id,
      versionNumber: version.versionNumber,
      name: book.name,
      description: book.description,
      scanDepth: book.scanDepth,
      tokenBudget: book.tokenBudget,
      recursiveScanning: book.recursiveScanning,
      entriesJson: snapshot.entriesJson,
      sourceKey: snapshot.sourceKey,
      createdAt: version.createdAt,
    })

    this.db.transaction((tx) => {
      tx.insert(lorebooks)
        .values({ ...bookValues(book), currentVersionId: null })
        .run()

      if (entries.length > 0) {
        tx.insert(lorebookEntries).values(entries.map(entryValues)).run()
      }

      tx.insert(lorebookVersions).values(versionValues(savedVersion)).run()

      tx.update(lorebooks)
        .set({ currentVersionId: savedVersion.id, updatedAt: new Date() })
        .where(eq(lorebooks.id, book.id))
        .run()
    })

    return {
      book: book.withCurrentVersionId(savedVersion.id),
      entries,
      version: savedVersion,
    }
  }

  async saveLiveHeadAndVersion(
    book: Lorebook,
    entries: LorebookEntry[],
    version?: LorebookVersion,
  ): Promise<SaveLiveHeadResult> {
    let result: SaveLiveHeadResult | undefined
    const snapshot = versionSnapshot(book, entries)

    this.db.transaction((tx) => {
      const container = tx
        .select()
        .from(lorebooks)
        .where(eq(lorebooks.id, book.id))
        .limit(1)
        .all()[0]

      if (!container) {
        tx.insert(lorebooks)
          .values({ ...bookValues(book), currentVersionId: null })
          .run()
      }

      const currentRows = container?.currentVersionId
        ? tx
            .select()
            .from(lorebookVersions)
            .where(eq(lorebookVersions.id, container.currentVersionId))
            .limit(1)
            .all()
        : tx
            .select()
            .from(lorebookVersions)
            .where(eq(lorebookVersions.lorebookId, book.id))
            .orderBy(desc(lorebookVersions.versionNumber))
            .limit(1)
            .all()

      const current = currentRows[0]
      const currentVersionId = current?.id ?? null
      const changed = !current || current.sourceKey !== snapshot.sourceKey
      let savedVersion: LorebookVersion | undefined

      if (changed) {
        const maxRow = tx
          .select({
            value: sql<number>`COALESCE(MAX(${lorebookVersions.versionNumber}), 0)`,
          })
          .from(lorebookVersions)
          .where(eq(lorebookVersions.lorebookId, book.id))
          .all()[0]

        savedVersion = LorebookVersion.create({
          id: version?.id ?? randomUUIDv7(),
          lorebookId: book.id,
          versionNumber: (maxRow?.value ?? 0) + 1,
          name: book.name,
          description: book.description,
          scanDepth: book.scanDepth,
          tokenBudget: book.tokenBudget,
          recursiveScanning: book.recursiveScanning,
          entriesJson: snapshot.entriesJson,
          sourceKey: snapshot.sourceKey,
          createdAt: version?.createdAt ?? new Date(),
        })

        tx.insert(lorebookVersions).values(versionValues(savedVersion)).run()
      }

      tx.update(lorebooks)
        .set({
          ...bookUpdateValues(book),
          currentVersionId: savedVersion?.id ?? currentVersionId ?? null,
        })
        .where(eq(lorebooks.id, book.id))
        .run()

      tx.delete(lorebookEntries)
        .where(eq(lorebookEntries.lorebookId, book.id))
        .run()

      if (entries.length > 0) {
        tx.insert(lorebookEntries).values(entries.map(entryValues)).run()
      }

      result = {
        book: book.withCurrentVersionId(
          savedVersion?.id ?? currentVersionId ?? null,
        ),
        entries,
        version: savedVersion,
        createdNewVersion: changed,
      }
    })

    if (!result) {
      throw new Error(`Lorebook '${book.id}' could not be saved`)
    }

    return result
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
      const existing = book.characterId !== null
        ? tx
            .select({ id: lorebooks.id })
            .from(lorebooks)
            .where(eq(lorebooks.characterId, book.characterId))
            .limit(1)
            .all()
        : tx
            .select({ id: lorebooks.id })
            .from(lorebooks)
            .where(eq(lorebooks.id, book.id))
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
