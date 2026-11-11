/**
 * Canonical lorebook serialization shared by the backend source-key hash.
 *
 * The hash itself (`node:crypto` SHA-256) stays in the backend: this module is
 * pure and safe for any runtime. Only content that defines a lorebook's
 * identity is serialized; local ids, `order` and timestamps are excluded.
 */

export interface LorebookCanonicalEntry {
  name: string | null
  keys: string[]
  secondaryKeys: string[]
  comment: string | null
  content: string
  constant: boolean
  selective: boolean
  selectiveLogic: number
  insertionOrder: number
  position: string
  priority: number
  enabled: boolean
  caseSensitive: boolean
  wholeWords: boolean
  order: number
  extensions: unknown
  unknownFields: unknown
}

export interface LorebookCanonicalContent {
  name: string | null
  description: string | null
  scanDepth: number
  tokenBudget: number
  recursiveScanning: boolean
  entries: LorebookCanonicalEntry[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Recursively sorts object keys so JSON key order never changes the digest. */
const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const item = value[key]
      if (item !== undefined) sorted[key] = stableValue(item)
    }
    return sorted
  }
  return value
}

/**
 * Serializes the identity of a lorebook: book settings plus entries in
 * presentation order (`order` asc, `insertionOrder` asc). `order` is not
 * emitted per entry because the array position already encodes the injection
 * order, so a relative reorder changes the string (and therefore the key).
 */
export function canonicalizeLorebookContent(
  content: LorebookCanonicalContent,
): string {
  const entries = [...content.entries].sort(
    (left, right) =>
      left.order - right.order ||
      left.insertionOrder - right.insertionOrder,
  )

  const canonical = {
    name: content.name,
    description: content.description,
    scanDepth: content.scanDepth,
    tokenBudget: content.tokenBudget,
    recursiveScanning: content.recursiveScanning,
    entries: entries.map((entry) => ({
      name: entry.name,
      keys: entry.keys,
      secondaryKeys: entry.secondaryKeys,
      comment: entry.comment,
      content: entry.content,
      constant: entry.constant,
      selective: entry.selective,
      selectiveLogic: entry.selectiveLogic,
      insertionOrder: entry.insertionOrder,
      position: entry.position,
      priority: entry.priority,
      enabled: entry.enabled,
      caseSensitive: entry.caseSensitive,
      wholeWords: entry.wholeWords,
      extensions: entry.extensions,
      unknownFields: entry.unknownFields,
    })),
  }

  return JSON.stringify(stableValue(canonical))
}
