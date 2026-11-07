/**
 * Pure helpers for SillyTavern card detection and projection. No I/O, no
 * `node:zlib` and no runtime validation: unknown JSON stays untouched.
 */

export const MAX_PROMPT_FIELD_CHARS = 20_000
export const MAX_LOREBOOK_ENTRIES = 1_000

export type SillyTavernShape =
  | { shape: "card"; spec: "chara_card_v2" | "chara_card_v3" }
  | { shape: "lorebook_ccv3" }
  | { shape: "lorebook_st_native"; container: "object" | "array" }
  | { shape: "v1" }
  | { shape: "unknown" }

const V1_MARKER_FIELDS = [
  "first_mes",
  "description",
  "personality",
  "scenario",
  "mes_example",
] as const

const PROMPT_FIELDS = [
  "description",
  "personality",
  "scenario",
  "mes_example",
  "system_prompt",
  "post_history_instructions",
] as const

const V3_ONLY_DATA_KEYS = new Set([
  "assets",
  "nickname",
  "group_only_greetings",
  "creator_notes_multilingual",
  "source",
  "creation_date",
  "modification_date",
])

const V3_ONLY_ENTRY_KEYS = new Set([
  "probability",
  "group",
  "group_override",
  "group_weight",
  "vectorized",
  "use_regex",
  "cooldown",
  "delay",
  "sticky",
  "delay_until_recursion",
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export function detectSillyTavernShape(root: unknown): SillyTavernShape {
  if (!isRecord(root)) {
    return { shape: "unknown" }
  }

  const spec = root.spec
  if (spec === "chara_card_v2" || spec === "chara_card_v3") {
    return { shape: "card", spec }
  }
  if (spec === "lorebook_v3") {
    return { shape: "lorebook_ccv3" }
  }

  // A root that declares `spec`/`data` but not a known shape is not a V1 card.
  if (spec !== undefined || root.data !== undefined) {
    return { shape: "unknown" }
  }

  if (root.entries !== undefined) {
    if (Array.isArray(root.entries)) {
      return { shape: "lorebook_st_native", container: "array" }
    }
    if (isRecord(root.entries)) {
      return { shape: "lorebook_st_native", container: "object" }
    }
    return { shape: "unknown" }
  }

  if (
    typeof root.name === "string" &&
    V1_MARKER_FIELDS.some((field) => field in root)
  ) {
    return { shape: "v1" }
  }

  return { shape: "unknown" }
}

/**
 * Drops decorator lines (`@@`/`@@@`) and the blank lines they leave behind.
 * The stored content is never mutated.
 */
export function stripDecorators(content: string): string {
  const lines = content
    .split("\n")
    .filter((line) => !line.startsWith("@@"))

  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === "") start++
  while (end > start && lines[end - 1].trim() === "") end--

  return lines.slice(start, end).join("\n")
}

function projectCharacterBookToV2(
  book: Record<string, unknown>,
): Record<string, unknown> {
  const projected = { ...book }
  if (!Array.isArray(book.entries)) {
    return projected
  }

  projected.entries = book.entries.map((entry) => {
    if (!isRecord(entry)) return entry
    const copy = { ...entry }
    for (const key of V3_ONLY_ENTRY_KEYS) delete copy[key]
    return copy
  })
  return projected
}

/**
 * Projects card `data` to the V2 subset: V3-only top-level keys and V3-only
 * character-book entry keys are omitted, while `extensions` is kept verbatim.
 */
export function projectCardToV2(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const projected: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (V3_ONLY_DATA_KEYS.has(key)) continue
    projected[key] =
      key === "character_book" && isRecord(value)
        ? projectCharacterBookToV2(value)
        : value
  }
  return projected
}

export function validateCardFieldSize(
  data: Record<string, unknown>,
): { ok: true } | { ok: false; field: string } {
  for (const field of PROMPT_FIELDS) {
    const value = data[field]
    if (typeof value === "string" && value.length > MAX_PROMPT_FIELD_CHARS) {
      return { ok: false, field }
    }
  }
  return { ok: true }
}
