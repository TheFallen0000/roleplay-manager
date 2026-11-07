import type { CharacterVersionDTO } from "@workspace/shared/types/character"
import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import type { CharacterCardFieldValues } from "./character-card-fields"
import type {
  LorebookEditorEntry,
  LorebookEditorValue,
} from "./lorebook-editor"

type JsonRecord = Record<string, unknown>

export function emptyLorebook(): LorebookEditorValue {
  return { name: "", entries: [] }
}

export function cardFieldsFromVersion(
  version?: CharacterVersionDTO,
): CharacterCardFieldValues {
  return {
    personality: version?.personality ?? "",
    scenario: version?.scenario ?? "",
    mesExample: version?.mesExample ?? "",
    alternateGreetings: version?.alternateGreetings ?? [],
    creatorNotes: version?.creatorNotes ?? "",
    tags: version?.tags ?? [],
    creator: version?.creator ?? "",
    cardCharacterVersion: version?.cardCharacterVersion ?? "",
    gender: version?.gender ?? "",
    pronouns: version?.pronouns ?? "",
    tagline: version?.tagline ?? "",
    systemPrompt: version?.systemPrompt ?? "",
    postHistoryInstructions: version?.postHistoryInstructions ?? "",
    extensions: version?.extensions ?? null,
    unknownFields: version?.unknownFields ?? null,
    unknownRootFields: version?.unknownRootFields ?? null,
  }
}

export function cardFieldsToInput(fields: CharacterCardFieldValues) {
  return {
    personality: fields.personality.trim() || null,
    scenario: fields.scenario.trim() || null,
    mesExample: fields.mesExample.trim() || null,
    alternateGreetings: fields.alternateGreetings,
    creatorNotes: fields.creatorNotes.trim() || null,
    tags: fields.tags,
    creator: fields.creator.trim() || null,
    cardCharacterVersion: fields.cardCharacterVersion.trim() || null,
    gender: fields.gender.trim() || null,
    pronouns: fields.pronouns.trim() || null,
    tagline: fields.tagline.trim() || null,
    systemPrompt: fields.systemPrompt.trim() || null,
    postHistoryInstructions: fields.postHistoryInstructions.trim() || null,
    extensions: fields.extensions,
    unknownFields: fields.unknownFields,
    unknownRootFields: fields.unknownRootFields,
  }
}

function toEditorEntry(
  entry: LorebookDTO["entries"][number],
): LorebookEditorEntry {
  return {
    id: entry.id,
    sourceId: entry.sourceId,
    name: entry.name ?? "",
    keys: entry.keys,
    content: entry.content,
    secondaryKeys: entry.secondaryKeys,
    constant: entry.constant,
    selective: entry.selective,
    selectiveLogic: entry.selectiveLogic,
    insertionOrder: entry.insertionOrder,
    position: entry.position,
    priority: entry.priority,
    enabled: entry.enabled,
    caseSensitive: entry.caseSensitive,
    wholeWords: entry.wholeWords,
    comment: entry.comment,
    rawPosition: entry.rawPosition,
    order: entry.order,
    extensions: entry.extensions,
    unknownFields: entry.unknownFields,
  }
}

export function lorebookToEditorValue(
  lorebook: LorebookDTO,
): LorebookEditorValue {
  return {
    name: lorebook.name ?? "",
    description: lorebook.description,
    scanDepth: lorebook.scanDepth,
    tokenBudget: lorebook.tokenBudget,
    recursiveScanning: lorebook.recursiveScanning,
    extensions: lorebook.extensions,
    unknownFields: lorebook.unknownFields,
    entries: lorebook.entries.map(toEditorEntry),
  }
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

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

const asSelectiveLogic = (
  value: unknown,
): LorebookEditorEntry["selectiveLogic"] => {
  const numeric = asInteger(value, 0)
  return numeric >= 0 && numeric <= 3
    ? (numeric as LorebookEditorEntry["selectiveLogic"])
    : 0
}

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

const pickUnknown = (
  value: JsonRecord,
  known: Set<string>,
): JsonRecord | null => {
  const unknown: JsonRecord = {}
  for (const [key, item] of Object.entries(value)) {
    if (!known.has(key)) unknown[key] = item
  }
  return Object.keys(unknown).length > 0 ? unknown : null
}

const NUMERIC_POSITIONS: Record<number, LorebookEditorEntry["position"]> = {
  0: "before_char",
  1: "after_char",
  2: "after_char",
  3: "after_char",
  4: "after_char",
  5: "before_char",
  6: "after_char",
}

const resolveEntryPosition = (
  value: unknown,
): Pick<LorebookEditorEntry, "position" | "rawPosition"> => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return {
      position: NUMERIC_POSITIONS[value] ?? "after_char",
      rawPosition: String(value),
    }
  }
  if (typeof value === "string") {
    return {
      position: value === "before_char" ? "before_char" : "after_char",
      rawPosition: value,
    }
  }
  return { position: "after_char", rawPosition: null }
}

const serializePosition = (entry: LorebookEditorEntry): string | number => {
  if (entry.rawPosition !== null && entry.rawPosition !== undefined) {
    const numeric = Number(entry.rawPosition)
    if (Number.isInteger(numeric) && String(numeric) === entry.rawPosition) {
      return numeric
    }
    if (entry.rawPosition !== "") return entry.rawPosition
  }
  return entry.position === "before_char" ? 0 : 1
}

const normalizeEntry = (
  value: unknown,
  index: number,
): LorebookEditorEntry => {
  const raw = isRecord(value) ? value : {}
  const { position, rawPosition } = resolveEntryPosition(raw.position)
  const enabled =
    raw.enabled !== undefined
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
    id: crypto.randomUUID(),
    sourceId,
    name: asNullableString(raw.name) ?? "",
    keys: raw.keys !== undefined ? asStringArray(raw.keys) : asStringArray(raw.key),
    content: asString(raw.content),
    secondaryKeys:
      raw.secondary_keys !== undefined
        ? asStringArray(raw.secondary_keys)
        : asStringArray(raw.keysecondary),
    constant: asBoolean(raw.constant, false),
    selective: asBoolean(raw.selective, false),
    selectiveLogic: asSelectiveLogic(raw.selectiveLogic ?? raw.selective_logic),
    insertionOrder: asInteger(raw.insertion_order ?? raw.order, 100),
    position,
    priority: asInteger(raw.priority, 0),
    enabled,
    caseSensitive: asBoolean(raw.case_sensitive ?? raw.caseSensitive, false),
    wholeWords: asBoolean(raw.whole_words ?? raw.matchWholeWords, false),
    comment: asNullableString(raw.comment),
    rawPosition,
    order: index,
    extensions: raw.extensions ?? null,
    unknownFields: pickUnknown(raw, ENTRY_KEYS),
  }
}

const parseEntries = (container: unknown): LorebookEditorEntry[] => {
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

interface LorebookSource {
  data: JsonRecord
  rootExtras: JsonRecord | null
}

const resolveLorebookSource = (root: unknown): LorebookSource | null => {
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
 * Parses a standalone CCv3 or ST native lorebook into the editor value. Used by
 * the create flow (and to populate the editor) without a round-trip to the API.
 */
export function parseLorebookPayload(payload: string): LorebookEditorValue {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new Error("INVALID_LOREBOOK_JSON")
  }

  const source = resolveLorebookSource(parsed)
  if (!source || source.data.entries === undefined) {
    throw new Error("INVALID_LOREBOOK_JSON")
  }

  const unknownData = pickUnknown(source.data, BOOK_KEYS)
  const unknownFields =
    unknownData || source.rootExtras
      ? { ...(unknownData ?? {}), ...(source.rootExtras ?? {}) }
      : null

  return {
    name: asString(source.data.name),
    description: asNullableString(source.data.description),
    scanDepth: Math.max(
      0,
      asInteger(source.data.scan_depth ?? source.data.scanDepth, 4),
    ),
    tokenBudget: Math.max(
      0,
      asInteger(source.data.token_budget ?? source.data.tokenBudget, 400),
    ),
    recursiveScanning: asBoolean(
      source.data.recursive_scanning ?? source.data.recursiveScanning,
      false,
    ),
    extensions: source.data.extensions ?? null,
    unknownFields,
    entries: parseEntries(source.data.entries),
  }
}

export function serializeLorebook(lorebook: LorebookEditorValue): string {
  const bookUnknown = isRecord(lorebook.unknownFields)
    ? lorebook.unknownFields
    : {}

  return JSON.stringify({
    spec: "lorebook_v3",
    data: {
      ...bookUnknown,
      name: lorebook.name || null,
      description: lorebook.description ?? null,
      scan_depth: lorebook.scanDepth ?? 4,
      token_budget: lorebook.tokenBudget ?? 400,
      recursive_scanning: lorebook.recursiveScanning ?? false,
      extensions: lorebook.extensions ?? null,
      entries: lorebook.entries.map((entry) => {
        const entryUnknown = isRecord(entry.unknownFields)
          ? entry.unknownFields
          : {}
        return {
          ...entryUnknown,
          ...(entry.sourceId ? { id: entry.sourceId } : {}),
          keys: entry.keys,
          secondary_keys: entry.secondaryKeys,
          content: entry.content,
          enabled: entry.enabled,
          insertion_order: entry.insertionOrder,
          case_sensitive: entry.caseSensitive,
          constant: entry.constant,
          selective: entry.selective,
          selectiveLogic: entry.selectiveLogic,
          position: serializePosition(entry),
          priority: entry.priority,
          comment: entry.comment,
          name: entry.name || null,
          whole_words: entry.wholeWords,
          extensions: entry.extensions ?? null,
        }
      }),
    },
  })
}
