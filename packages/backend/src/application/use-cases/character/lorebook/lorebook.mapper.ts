import { v7 as randomUUIDv7 } from "uuid"

import {
  Lorebook,
  type Lorebook as LorebookEntity,
} from "../../../../domain/entities/lorebook.entity"
import {
  LorebookEntry,
  type LorebookEntry as LorebookEntryEntity,
  type LorebookSelectiveLogic,
} from "../../../../domain/entities/lorebook-entry.entity"
import { LorebookValidationError } from "../../../../domain/errors"

/**
 * Pure mapping between the SillyTavern lorebook wire shapes (CCv3 and the
 * native `{ entries }` container) and the normalized Lorebook entities/DTOs.
 */

export type LorebookPosition = "before_char" | "after_char"

export interface NormalizedLorebookEntry {
  name: string | null
  sourceId: string | null
  keys: string[]
  secondaryKeys: string[]
  comment: string | null
  content: string
  constant: boolean
  selective: boolean
  selectiveLogic: LorebookSelectiveLogic
  insertionOrder: number
  position: LorebookPosition
  rawPosition: string | null
  priority: number
  enabled: boolean
  caseSensitive: boolean
  wholeWords: boolean
  order: number
  extensions: unknown
  unknownFields: unknown
}

export interface NormalizedLorebook {
  name: string | null
  description: string | null
  scanDepth: number
  tokenBudget: number
  recursiveScanning: boolean
  extensions: unknown
  unknownFields: unknown
  entries: NormalizedLorebookEntry[]
}

export interface LorebookEntities {
  book: LorebookEntity
  entries: LorebookEntryEntity[]
}

type JsonRecord = Record<string, unknown>

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const BOOK_KEYS = new Set([
  "name",
  "description",
  "scan_depth",
  "scanDepth",
  "token_budget",
  "tokenBudget",
  "recursive_scanning",
  "recursiveScanning",
  "extensions",
  "entries",
])

const ENTRY_KEYS = new Set([
  "name",
  "id",
  "uid",
  "keys",
  "key",
  "secondary_keys",
  "keysecondary",
  "comment",
  "content",
  "constant",
  "selective",
  "selectiveLogic",
  "selective_logic",
  "insertion_order",
  "order",
  "position",
  "priority",
  "enabled",
  "disable",
  "case_sensitive",
  "caseSensitive",
  "whole_words",
  "matchWholeWords",
  "extensions",
])

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback

const asNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  return value.trim() === "" ? null : value
}

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }
  if (typeof value === "string" && value.trim() !== "") return [value]
  return []
}

const asInteger = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) ? value : fallback

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback

const asSelectiveLogic = (value: unknown): LorebookSelectiveLogic => {
  const numeric = asInteger(value, 0)
  return numeric >= 0 && numeric <= 3
    ? (numeric as LorebookSelectiveLogic)
    : 0
}

const NUMERIC_POSITIONS: Record<number, LorebookPosition> = {
  0: "before_char",
  1: "after_char",
  2: "after_char",
  3: "after_char",
  4: "after_char",
  5: "before_char",
  6: "after_char",
}

export const resolveEntryPosition = (
  value: unknown,
): { position: LorebookPosition; rawPosition: string | null } => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return {
      position: NUMERIC_POSITIONS[value] ?? "after_char",
      rawPosition: String(value),
    }
  }
  if (typeof value === "string") {
    if (value === "before_char") {
      return { position: "before_char", rawPosition: value }
    }
    return { position: "after_char", rawPosition: value }
  }
  return { position: "after_char", rawPosition: null }
}

export const serializeEntryPosition = (
  rawPosition: string | null,
  position: LorebookPosition,
): string | number => {
  if (rawPosition !== null && rawPosition !== "") {
    const numeric = Number(rawPosition)
    if (Number.isInteger(numeric) && String(numeric) === rawPosition) {
      return numeric
    }
    return rawPosition
  }
  return position === "before_char" ? 0 : 1
}

const pickUnknown = (value: JsonRecord, known: Set<string>): JsonRecord | null => {
  const unknown: JsonRecord = {}
  for (const [key, item] of Object.entries(value)) {
    if (!known.has(key)) unknown[key] = item
  }
  return Object.keys(unknown).length > 0 ? unknown : null
}

const normalizeEntry = (
  value: unknown,
  index: number,
): NormalizedLorebookEntry => {
  const raw = isRecord(value) ? value : {}
  const { position, rawPosition } = resolveEntryPosition(raw.position)

  const enabled = raw.enabled !== undefined
    ? asBoolean(raw.enabled, true)
    : raw.disable !== undefined
      ? !asBoolean(raw.disable, false)
      : true

  const sourceValue = raw.id ?? raw.uid
  const sourceId =
    sourceValue === undefined || sourceValue === null
      ? null
      : String(sourceValue)

  return {
    name: asNullableString(raw.name),
    sourceId,
    keys: raw.keys !== undefined ? asStringArray(raw.keys) : asStringArray(raw.key),
    secondaryKeys:
      raw.secondary_keys !== undefined
        ? asStringArray(raw.secondary_keys)
        : asStringArray(raw.keysecondary),
    comment: asNullableString(raw.comment),
    content: asString(raw.content),
    constant: asBoolean(raw.constant, false),
    selective: asBoolean(raw.selective, false),
    selectiveLogic: asSelectiveLogic(raw.selectiveLogic ?? raw.selective_logic),
    insertionOrder: asInteger(raw.insertion_order ?? raw.order, 100),
    position,
    rawPosition,
    priority: asInteger(raw.priority, 0),
    enabled,
    caseSensitive: asBoolean(
      raw.case_sensitive ?? raw.caseSensitive,
      false,
    ),
    wholeWords: asBoolean(raw.whole_words ?? raw.matchWholeWords, false),
    order: index,
    extensions: raw.extensions ?? null,
    unknownFields: pickUnknown(raw, ENTRY_KEYS),
  }
}

const entriesFromContainer = (container: unknown): NormalizedLorebookEntry[] => {
  if (Array.isArray(container)) {
    return container.map((entry, index) => normalizeEntry(entry, index))
  }
  if (isRecord(container)) {
    return Object.entries(container).map(([key, entry], index) => {
      if (!isRecord(entry)) return normalizeEntry({}, index)
      const withUid =
        entry.uid === undefined && entry.id === undefined
          ? { ...entry, uid: key }
          : entry
      return normalizeEntry(withUid, index)
    })
  }
  return []
}

interface ResolvedLorebookSource {
  data: JsonRecord
  rootExtras: JsonRecord | null
}

const resolveLorebookSource = (root: unknown): ResolvedLorebookSource | null => {
  if (!isRecord(root)) return null

  if (isRecord(root.character_book)) {
    return { data: root.character_book, rootExtras: null }
  }

  if (isRecord(root.data)) {
    if (isRecord(root.data.character_book)) {
      return { data: root.data.character_book, rootExtras: null }
    }
    const { spec: _spec, data: _data, ...extras } = root
    return {
      data: root.data,
      rootExtras: Object.keys(extras).length > 0 ? extras : null,
    }
  }

  if (root.entries !== undefined) {
    return { data: root, rootExtras: null }
  }

  return null
}

/**
 * Normalizes a card, a CCv3 standalone lorebook or an ST native container.
 * Returns `null` when the input carries no lorebook at all.
 */
export function normalizeLorebook(root: unknown): NormalizedLorebook | null {
  const source = resolveLorebookSource(root)
  if (!source) return null

  const { data, rootExtras } = source
  if (data.entries === undefined && !rootExtras) return null

  const unknownData = pickUnknown(data, BOOK_KEYS)
  const unknownFields =
    unknownData || rootExtras
      ? { ...(unknownData ?? {}), ...(rootExtras ?? {}) }
      : null

  return {
    name: asNullableString(data.name),
    description: asNullableString(data.description),
    scanDepth: Math.max(
      0,
      asInteger(data.scan_depth ?? data.scanDepth, 4),
    ),
    tokenBudget: Math.max(
      0,
      asInteger(data.token_budget ?? data.tokenBudget, 400),
    ),
    recursiveScanning: asBoolean(
      data.recursive_scanning ?? data.recursiveScanning,
      false,
    ),
    extensions: data.extensions ?? null,
    unknownFields,
    entries: entriesFromContainer(data.entries),
  }
}

export function buildLorebookEntities(
  root: unknown,
  characterId: string,
  options: { bookId?: string; now?: Date } = {},
): LorebookEntities | null {
  const normalized = normalizeLorebook(root)
  if (!normalized) return null

  const bookId = options.bookId ?? randomUUIDv7()
  const now = options.now ?? new Date()

  const book = Lorebook.create({
    id: bookId,
    characterId,
    name: normalized.name,
    description: normalized.description,
    scanDepth: normalized.scanDepth,
    tokenBudget: normalized.tokenBudget,
    recursiveScanning: normalized.recursiveScanning,
    extensions: normalized.extensions,
    unknownFields: normalized.unknownFields,
    createdAt: now,
    updatedAt: now,
  })

  const entries = normalized.entries.map((entry, order) =>
    LorebookEntry.create({
      id: randomUUIDv7(),
      lorebookId: bookId,
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
      order,
      extensions: entry.extensions,
      unknownFields: entry.unknownFields,
      createdAt: now,
      updatedAt: now,
    }),
  )

  return { book, entries }
}

export interface LorebookEntryLike {
  id?: string
  name?: string | null
  sourceId?: string | null
  keys?: string[]
  secondaryKeys?: string[]
  comment?: string | null
  content?: string
  constant?: boolean
  selective?: boolean
  selectiveLogic?: LorebookSelectiveLogic
  insertionOrder?: number
  position?: LorebookPosition
  rawPosition?: string | null
  priority?: number
  enabled?: boolean
  caseSensitive?: boolean
  wholeWords?: boolean
  order?: number
  extensions?: unknown
  unknownFields?: unknown
}

export interface LorebookLike {
  id?: string
  characterId?: string | null
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  extensions?: unknown
  unknownFields?: unknown
  entries?: LorebookEntryLike[]
  book?: LorebookLike
}

const bookOf = (lorebook: LorebookLike): LorebookLike =>
  isRecord(lorebook.book) ? (lorebook.book as LorebookLike) : lorebook

const entriesOf = (lorebook: LorebookLike): LorebookEntryLike[] => {
  if (Array.isArray(lorebook.entries)) return lorebook.entries
  const book = bookOf(lorebook)
  return Array.isArray(book.entries) ? book.entries : []
}

export const toLorebookEntryDTO = (
  entry: LorebookEntryEntity,
): import("@workspace/shared/types/sillytavern-card").LorebookEntryDTO => ({
  id: entry.id,
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

export const toLorebookDTO = (
  book: LorebookEntity,
  entries: LorebookEntryEntity[],
): import("@workspace/shared/types/sillytavern-card").LorebookDTO => ({
  id: book.id,
  characterId: book.characterId,
  name: book.name,
  description: book.description,
  scanDepth: book.scanDepth,
  tokenBudget: book.tokenBudget,
  recursiveScanning: book.recursiveScanning,
  extensions: book.extensions,
  unknownFields: book.unknownFields,
  entries: entries.map(toLorebookEntryDTO),
})

const entryToCardData = (entry: LorebookEntryLike): JsonRecord => {
  const unknown = isRecord(entry.unknownFields) ? entry.unknownFields : {}
  const sourceId = entry.sourceId ?? null
  return {
    ...unknown,
    ...(entry.name ? { name: entry.name } : {}),
    ...(sourceId ? { id: sourceId } : {}),
    keys: entry.keys ?? [],
    secondary_keys: entry.secondaryKeys ?? [],
    comment: entry.comment ?? null,
    content: entry.content ?? "",
    constant: entry.constant ?? false,
    selective: entry.selective ?? false,
    selectiveLogic: entry.selectiveLogic ?? 0,
    insertion_order: entry.insertionOrder ?? 100,
    position: serializeEntryPosition(
      entry.rawPosition ?? null,
      entry.position ?? "after_char",
    ),
    priority: entry.priority ?? 0,
    enabled: entry.enabled ?? true,
    case_sensitive: entry.caseSensitive ?? false,
    whole_words: entry.wholeWords ?? false,
    extensions: entry.extensions ?? null,
  }
}

const bookToCardData = (lorebook: LorebookLike): JsonRecord => {
  const book = bookOf(lorebook)
  const entries = entriesOf(lorebook)
  const unknown = isRecord(book.unknownFields) ? book.unknownFields : {}

  return {
    ...unknown,
    ...(book.name ? { name: book.name } : {}),
    ...(book.description ? { description: book.description } : {}),
    scan_depth: book.scanDepth ?? 4,
    token_budget: book.tokenBudget ?? 400,
    recursive_scanning: book.recursiveScanning ?? false,
    extensions: book.extensions ?? null,
    entries: entries.map(entryToCardData),
  }
}

export const buildCharacterBookData = (
  lorebook: LorebookLike | null | undefined,
): JsonRecord | null =>
  lorebook ? bookToCardData(lorebook) : null

/** CCv3 standalone export: `{ spec: "lorebook_v3", data }`, no `spec_version`. */
export const toCCv3Lorebook = (
  lorebook: LorebookLike,
): { spec: "lorebook_v3"; data: JsonRecord } => ({
  spec: "lorebook_v3",
  data: bookToCardData(lorebook),
})

const entryToStNativeData = (entry: LorebookEntryLike): JsonRecord => {
  const unknown = isRecord(entry.unknownFields) ? entry.unknownFields : {}
  return {
    ...unknown,
    ...(entry.name ? { name: entry.name } : {}),
    key: entry.keys ?? [],
    keysecondary: entry.secondaryKeys ?? [],
    comment: entry.comment ?? null,
    content: entry.content ?? "",
    constant: entry.constant ?? false,
    selective: entry.selective ?? false,
    selectiveLogic: entry.selectiveLogic ?? 0,
    order: entry.insertionOrder ?? 100,
    position: serializeEntryPosition(
      entry.rawPosition ?? null,
      entry.position ?? "after_char",
    ),
    priority: entry.priority ?? 0,
    disable: !(entry.enabled ?? true),
    caseSensitive: entry.caseSensitive ?? false,
    matchWholeWords: entry.wholeWords ?? false,
    extensions: entry.extensions ?? null,
  }
}

/** ST native export: a keyed-by-uid `{ entries: { <id>: ... } }` object. */
export const toStNativeLorebook = (
  lorebook: LorebookLike,
): { entries: Record<string, JsonRecord> } => {
  const entries: Record<string, JsonRecord> = {}
  for (const entry of entriesOf(lorebook)) {
    const key = entry.sourceId ?? entry.id
    if (key) entries[key] = entryToStNativeData(entry)
  }
  return { entries }
}

export const assertLorebookEntryCount = (
  lorebook: NormalizedLorebook,
  maximum: number,
): void => {
  if (lorebook.entries.length > maximum) {
    throw new LorebookValidationError(
      `A lorebook can have at most ${maximum} entries.`,
    )
  }
}
