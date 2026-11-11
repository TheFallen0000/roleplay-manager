import { translate } from "@workspace/shared/i18n"
import type {
  RmExtensions,
  SillyTavernCardWarning,
} from "@workspace/shared/types/sillytavern-card"
import { detectSillyTavernShape } from "@workspace/shared/lib/sillytavern-card"

import { DomainError } from "../../../domain/errors"

import {
  buildCharacterBookData,
  isRecord,
  normalizeLorebook,
  type LorebookEntryLike,
  type LorebookLike,
  type NormalizedLorebook,
} from "./lorebook/lorebook.mapper"

/**
 * Pure card <-> entity mapping. It keeps the three unknown buckets separate:
 * `extensions`, unknown `data` keys and unknown root keys.
 */

export interface CardVersionFields {
  name: string
  description: string
  personality: string | null
  scenario: string | null
  greeting: string
  mesExample: string | null
  systemPrompt: string | null
  postHistoryInstructions: string | null
  alternateGreetings: string[]
  creatorNotes: string | null
  tags: string[]
  creator: string | null
  cardCharacterVersion: string | null
  gender: string | null
  pronouns: string | null
  subtitle: string | null
  instructions: string | null
  knowledgeCards?: Array<{
    title: string
    content: string
    position: number
    active: boolean
  }>
  rmLorebook?: RmExtensions["lorebook"]
  tagline: string | null
  extensions: unknown
  unknownFields: unknown
  unknownRootFields: unknown
  lorebook: NormalizedLorebook | null
  warnings: SillyTavernCardWarning[]
}

export interface ParsedCardRoot {
  root: Record<string, unknown>
  data: Record<string, unknown>
  cardVersion: "v1" | "v2" | "v3"
}

const DATA_KEYS = new Set([
  "name",
  "description",
  "personality",
  "scenario",
  "first_mes",
  "mes_example",
  "system_prompt",
  "post_history_instructions",
  "alternate_greetings",
  "creator_notes",
  "tags",
  "creator",
  "character_version",
  "gender",
  "pronouns",
  "extensions",
  "character_book",
])

const V1_ROOT_KEYS = new Set([
  "name",
  "description",
  "personality",
  "scenario",
  "first_mes",
  "mes_example",
])

const ENVELOPE_KEYS = new Set(["spec", "spec_version", "data"])

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback

const asOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  return value.trim() === "" ? null : value
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []

const pickUnknown = (
  value: Record<string, unknown>,
  known: Set<string>,
): Record<string, unknown> | null => {
  const unknown: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (!known.has(key)) unknown[key] = item
  }
  return Object.keys(unknown).length > 0 ? unknown : null
}

const asOptionalInteger = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) ? value : null

const RM_KEYS = [
  "subtitle",
  "instructions",
  "knowledgeCards",
  "versionNumber",
  "tagline",
  "lorebook",
] as const

/** Callers may carry a widened `version`; the writer always emits `1`. */
type RmExtensionsInput = Omit<RmExtensions, "version"> & { version?: number }

const readKnowledgeCards = (
  value: unknown,
): RmExtensions["knowledgeCards"] => {
  if (!Array.isArray(value)) return undefined
  const cards: NonNullable<RmExtensions["knowledgeCards"]> = []
  value.forEach((item, index) => {
    if (!isRecord(item)) return
    if (typeof item.title !== "string" || typeof item.content !== "string") {
      return
    }
    cards.push({
      title: item.title,
      content: item.content,
      position: asOptionalInteger(item.position) ?? index,
      active: typeof item.active === "boolean" ? item.active : true,
    })
  })
  return cards
}

const readRmLorebook = (value: unknown): RmExtensions["lorebook"] => {
  if (!isRecord(value)) return undefined
  const lorebookId = asOptionalString(value.lorebookId)
  const lorebookVersionId = asOptionalString(value.lorebookVersionId)
  const versionNumber = asOptionalInteger(value.versionNumber)
  const sourceKey = asOptionalString(value.sourceKey)
  if (
    lorebookId === null ||
    lorebookVersionId === null ||
    versionNumber === null ||
    sourceKey === null
  ) {
    return undefined
  }
  const originId = asOptionalString(value.originId)
  return {
    lorebookId,
    lorebookVersionId,
    versionNumber,
    sourceKey,
    ...(originId !== null ? { originId } : {}),
  }
}

/** Extracts only the RM-owned keys from a card's `extensions.rm` namespace. */
export function readRmExtensions(extensions: unknown): RmExtensions | null {
  if (!isRecord(extensions) || !isRecord(extensions.rm)) return null
  const rm = extensions.rm
  const result: RmExtensions = { version: 1 }

  const subtitle = asOptionalString(rm.subtitle)
  if (subtitle !== null) result.subtitle = subtitle
  const instructions = asOptionalString(rm.instructions)
  if (instructions !== null) result.instructions = instructions
  const knowledgeCards = readKnowledgeCards(rm.knowledgeCards)
  if (knowledgeCards !== undefined) result.knowledgeCards = knowledgeCards
  const versionNumber = asOptionalInteger(rm.versionNumber)
  if (versionNumber !== null) result.versionNumber = versionNumber
  const tagline = asOptionalString(rm.tagline)
  if (tagline !== null) result.tagline = tagline
  const lorebook = readRmLorebook(rm.lorebook)
  if (lorebook !== undefined) result.lorebook = lorebook

  return result
}

/**
 * Merges the known RM keys into `extensions.rm` while keeping every other
 * namespace and unknown `rm` key intact.
 */
export function withRmExtensions(
  extensions: unknown,
  rm: RmExtensionsInput,
): unknown {
  const mergedRm: Record<string, unknown> = { version: 1 }
  for (const key of RM_KEYS) {
    const value = rm[key]
    if (value !== undefined) mergedRm[key] = value
  }
  if (!isRecord(extensions)) return { rm: mergedRm }
  const currentRm = isRecord(extensions.rm) ? extensions.rm : {}
  return { ...extensions, rm: { ...currentRm, ...mergedRm } }
}

const isV1Input = (
  data: Record<string, unknown>,
  root: Record<string, unknown> | undefined,
): boolean =>
  root !== undefined &&
  root.spec === undefined &&
  root.data === undefined &&
  data.entries === undefined &&
  !isRecord(data.character_book)

/**
 * Decodes the root of a card payload and returns the `data` object plus the
 * detected card version. Throws `INVALID_CARD_JSON` for non-card inputs.
 */
export const parseCardRoot = (payload: unknown): ParsedCardRoot => {
  const shape = detectSillyTavernShape(payload)
  if (shape.shape === "v1" && isRecord(payload)) {
    return { root: payload, data: payload, cardVersion: "v1" }
  }
  if (shape.shape === "card" && isRecord(payload) && isRecord(payload.data)) {
    return {
      root: payload,
      data: payload.data,
      cardVersion: shape.spec === "chara_card_v3" ? "v3" : "v2",
    }
  }
  throw new DomainError(
    "INVALID_CARD_JSON",
    "The payload is not a SillyTavern character card.",
    400,
  )
}

export function cardDataToVersionFields(
  data: unknown,
  root?: unknown,
): CardVersionFields {
  const dataRecord = isRecord(data) ? data : {}
  const rootRecord = isRecord(root) ? root : undefined
  const v1 = isV1Input(dataRecord, rootRecord)
  const shape = detectSillyTavernShape(dataRecord)
  const lorebookOnly =
    shape.shape === "lorebook_ccv3" || shape.shape === "lorebook_st_native"

  const name = asString(dataRecord.name)
  if (!name.trim() && !lorebookOnly) {
    throw new DomainError(
      "INVALID_CARD_NAME",
      "The card name is required.",
      400,
    )
  }

  const warnings: SillyTavernCardWarning[] = []

  const rawDescription = asString(dataRecord.description)
  const description =
    rawDescription.trim() === ""
      ? translate("en", "characters.cardFallbackDescription")
      : rawDescription
  if (rawDescription.trim() === "") warnings.push("EMPTY_DESCRIPTION")

  let alternateGreetings = asStringArray(dataRecord.alternate_greetings)
  let greeting = asString(dataRecord.first_mes)
  if (greeting.trim() === "") {
    if (alternateGreetings.length > 0) {
      greeting = alternateGreetings[0]
      alternateGreetings = alternateGreetings.slice(1)
    } else {
      greeting = translate("en", "characters.cardFallbackGreeting")
      warnings.push("EMPTY_GREETING")
    }
  }

  const extensions = dataRecord.extensions ?? null
  const rm = readRmExtensions(extensions)
  const unknownRootFields = rootRecord
    ? pickUnknown(rootRecord, v1 ? V1_ROOT_KEYS : ENVELOPE_KEYS)
    : null

  return {
    name,
    description,
    personality: asOptionalString(dataRecord.personality),
    scenario: asOptionalString(dataRecord.scenario),
    greeting,
    mesExample: asOptionalString(dataRecord.mes_example),
    systemPrompt: asOptionalString(dataRecord.system_prompt),
    postHistoryInstructions: asOptionalString(
      dataRecord.post_history_instructions,
    ),
    alternateGreetings,
    creatorNotes: asOptionalString(dataRecord.creator_notes),
    tags: asStringArray(dataRecord.tags),
    creator: asOptionalString(dataRecord.creator),
    cardCharacterVersion: asOptionalString(dataRecord.character_version),
    gender: asOptionalString(dataRecord.gender),
    pronouns: asOptionalString(dataRecord.pronouns),
    subtitle: rm?.subtitle ?? null,
    instructions: rm?.instructions ?? null,
    knowledgeCards: rm?.knowledgeCards,
    rmLorebook: rm?.lorebook,
    tagline: rm?.tagline ?? null,
    extensions,
    unknownFields: v1 ? null : pickUnknown(dataRecord, DATA_KEYS),
    unknownRootFields,
    lorebook: normalizeLorebook(dataRecord),
    warnings,
  }
}

interface VersionLike {
  name?: unknown
  description?: unknown
  personality?: unknown
  scenario?: unknown
  greeting?: unknown
  mesExample?: unknown
  systemPrompt?: unknown
  postHistoryInstructions?: unknown
  alternateGreetings?: unknown
  creatorNotes?: unknown
  tags?: unknown
  creator?: unknown
  cardCharacterVersion?: unknown
  gender?: unknown
  pronouns?: unknown
  subtitle?: unknown
  instructions?: unknown
  cards?: unknown
  versionNumber?: unknown
  tagline?: unknown
  lorebookVersionId?: unknown
  extensions?: unknown
  unknownFields?: unknown
}

const toKnowledgeCards = (cards: unknown): RmExtensions["knowledgeCards"] => {
  if (!Array.isArray(cards)) return undefined
  const mapped: NonNullable<RmExtensions["knowledgeCards"]> = []
  cards.forEach((card) => {
    if (!isRecord(card)) return
    const title = asOptionalString(card.title)
    const content = asOptionalString(card.content)
    if (title === null || content === null) return
    mapped.push({
      title,
      content,
      position: asOptionalInteger(card.position) ?? 0,
      active: typeof card.active === "boolean" ? card.active : true,
    })
  })
  return mapped
}

const toLorebookFingerprint = (
  lorebook: LorebookLike | null | undefined,
  version: VersionLike,
): RmExtensions["lorebook"] => {
  if (!lorebook) return undefined
  const source = isRecord(lorebook.book)
    ? (lorebook.book as LorebookLike)
    : lorebook
  const lorebookId =
    asOptionalString(lorebook.lorebookId) ??
    asOptionalString(source.lorebookId) ??
    asOptionalString(source.id)
  const lorebookVersionId =
    asOptionalString(lorebook.lorebookVersionId) ??
    asOptionalString(source.lorebookVersionId) ??
    asOptionalString(version.lorebookVersionId)
  const versionNumber = asOptionalInteger(
    lorebook.versionNumber ?? source.versionNumber,
  )
  const sourceKey =
    asOptionalString(lorebook.sourceKey) ?? asOptionalString(source.sourceKey)
  const originId =
    asOptionalString(lorebook.originId) ?? asOptionalString(source.originId)

  if (
    lorebookId === null ||
    lorebookVersionId === null ||
    versionNumber === null ||
    sourceKey === null
  ) {
    return undefined
  }

  return {
    lorebookId,
    lorebookVersionId,
    versionNumber,
    sourceKey,
    ...(originId !== null ? { originId } : {}),
  }
}

/** Minimal shape shared by the entity and the repository row mocks. */
export interface LorebookVersionLike {
  id: string
  lorebookId: string
  versionNumber: number
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  entriesJson: string
  sourceKey: string
}

const versionEntries = (entriesJson: string): LorebookEntryLike[] => {
  try {
    const parsed: unknown = JSON.parse(entriesJson)
    return Array.isArray(parsed)
      ? parsed.filter(isRecord).map((entry) => entry as LorebookEntryLike)
      : []
  } catch {
    return []
  }
}

/**
 * Adapts an immutable lorebook version to the `LorebookLike` shape used by the
 * card export, carrying the fingerprint metadata `extensions.rm.lorebook` needs.
 */
export function lorebookVersionToCardLorebook(
  version: LorebookVersionLike,
  options: { originId?: string | null } = {},
): LorebookLike {
  return {
    lorebookId: version.lorebookId,
    lorebookVersionId: version.id,
    versionNumber: version.versionNumber,
    sourceKey: version.sourceKey,
    originId: options.originId ?? null,
    name: version.name ?? null,
    description: version.description ?? null,
    scanDepth: version.scanDepth ?? 4,
    tokenBudget: version.tokenBudget ?? 400,
    recursiveScanning: version.recursiveScanning ?? false,
    entries: versionEntries(version.entriesJson),
  }
}

export function versionFieldsToCardData(
  version: VersionLike,
  lorebook: LorebookLike | null | undefined,
): Record<string, unknown> {
  const unknownFields = isRecord(version.unknownFields)
    ? version.unknownFields
    : {}

  const data: Record<string, unknown> = { ...unknownFields }
  data.name = asString(version.name)
  data.description = asString(version.description)
  data.first_mes = asString(version.greeting)

  const optional: Array<[string, unknown]> = [
    ["personality", version.personality],
    ["scenario", version.scenario],
    ["mes_example", version.mesExample],
    ["system_prompt", version.systemPrompt],
    ["post_history_instructions", version.postHistoryInstructions],
    ["creator_notes", version.creatorNotes],
    ["creator", version.creator],
    ["character_version", version.cardCharacterVersion],
    ["gender", version.gender],
    ["pronouns", version.pronouns],
  ]
  for (const [key, value] of optional) {
    const text = asOptionalString(value)
    if (text !== null) data[key] = text
  }

  const alternateGreetings = asStringArray(version.alternateGreetings)
  if (alternateGreetings.length > 0) {
    data.alternate_greetings = alternateGreetings
  }

  const tags = asStringArray(version.tags)
  if (tags.length > 0) data.tags = tags

  const rm: RmExtensions = {
    version: 1,
    subtitle: asOptionalString(version.subtitle),
    instructions: asOptionalString(version.instructions),
  }
  const knowledgeCards = toKnowledgeCards(version.cards)
  if (knowledgeCards !== undefined && knowledgeCards.length > 0) {
    rm.knowledgeCards = knowledgeCards
  }
  const versionNumber = asOptionalInteger(version.versionNumber)
  if (versionNumber !== null) rm.versionNumber = versionNumber
  const tagline = asOptionalString(version.tagline)
  if (tagline !== null) rm.tagline = tagline
  const lorebookFingerprint = toLorebookFingerprint(lorebook, version)
  if (lorebookFingerprint !== undefined) rm.lorebook = lorebookFingerprint

  data.extensions = withRmExtensions(version.extensions, rm)

  const characterBook = buildCharacterBookData(lorebook)
  if (characterBook) data.character_book = characterBook

  return data
}

const rawEntries = (data: Record<string, unknown>): Record<string, unknown>[] => {
  const source = isRecord(data.character_book) ? data.character_book : data
  if (Array.isArray(source.entries)) {
    return source.entries.filter(isRecord)
  }
  if (isRecord(source.entries)) {
    return Object.values(source.entries).filter(isRecord)
  }
  return []
}

/**
 * Collects the presentation warnings that depend on lorebook entry fields
 * rather than on the mapped character fields.
 */
export function collectCardWarnings(
  data: Record<string, unknown>,
): SillyTavernCardWarning[] {
  const warnings = new Set<SillyTavernCardWarning>()
  for (const entry of rawEntries(data)) {
    if (entry.use_regex === true || entry.useRegex === true) {
      warnings.add("REGEX_IGNORED")
    }
    if (
      entry.cooldown !== undefined ||
      entry.delay !== undefined ||
      entry.sticky !== undefined ||
      entry.delay_until_recursion !== undefined
    ) {
      warnings.add("TIMED_EFFECTS_PRESERVED")
    }
    if (entry.scanDepth !== undefined || entry.scan_depth !== undefined) {
      warnings.add("SCAN_DEPTH_PER_ENTRY_IGNORED")
    }
  }
  return [...warnings]
}
