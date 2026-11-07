import { translate } from "@workspace/shared/i18n"
import type { SillyTavernCardWarning } from "@workspace/shared/types/sillytavern-card"
import { detectSillyTavernShape } from "@workspace/shared/lib/sillytavern-card"

import { DomainError } from "../../../domain/errors"

import {
  buildCharacterBookData,
  isRecord,
  normalizeLorebook,
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

const readTagline = (extensions: unknown): string | null => {
  if (!isRecord(extensions) || !isRecord(extensions.rm)) return null
  return asOptionalString(extensions.rm.tagline)
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
    tagline: readTagline(extensions),
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
  tagline?: unknown
  extensions?: unknown
  unknownFields?: unknown
}

const withTagline = (extensions: unknown, tagline: string | null): unknown => {
  if (!tagline) return extensions ?? null
  if (isRecord(extensions)) {
    const rm = isRecord(extensions.rm) ? extensions.rm : {}
    return { ...extensions, rm: { ...rm, tagline } }
  }
  return { rm: { tagline } }
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

  const extensions = withTagline(
    version.extensions,
    asOptionalString(version.tagline),
  )
  if (extensions !== null) data.extensions = extensions

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
