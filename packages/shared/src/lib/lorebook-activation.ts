/**
 * Pure lorebook activation: literal key matching, selective logic, token
 * budget and bounded recursive scanning. It performs no I/O and never treats
 * user-provided keys as regular expressions.
 */

import { stripDecorators } from "./sillytavern-card"
import { estimateTextTokens } from "./token-estimate"

export const MAX_LOREBOOK_RECURSION_DEPTH = 3

export interface LorebookActivationEntry {
  id: string
  keys: string[]
  secondaryKeys: string[]
  content: string
  constant: boolean
  selective: boolean
  selectiveLogic: 0 | 1 | 2 | 3
  insertionOrder: number
  priority: number
  enabled: boolean
  caseSensitive: boolean
  wholeWords: boolean
  useRegex: boolean
  order: number
  position: "before_char" | "after_char"
}

export interface LorebookActivationInput {
  entries: LorebookActivationEntry[]
  scanText: string
  tokenBudget: number
  recursiveScanning?: boolean
}

export interface LorebookActivationResult {
  included: LorebookActivationEntry[]
  overBudgetCount: number
  skipped: number
}

interface MatchOptions {
  caseSensitive: boolean
  wholeWords: boolean
}

const isWordChar = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95
  )
}

export function matchesKey(
  text: string,
  key: string,
  opts: MatchOptions,
): boolean {
  if (key.length === 0) return false

  const haystack = opts.caseSensitive ? text : text.toLowerCase()
  const needle = opts.caseSensitive ? key : key.toLowerCase()

  let index = haystack.indexOf(needle)
  if (index === -1) return false
  if (!opts.wholeWords) return true

  while (index !== -1) {
    const before = index === 0 ? "" : haystack[index - 1]
    const afterIndex = index + needle.length
    const after = afterIndex >= haystack.length ? "" : haystack[afterIndex]
    const atStart = before === "" || !isWordChar(before)
    const atEnd = after === "" || !isWordChar(after)
    if (atStart && atEnd) return true
    index = haystack.indexOf(needle, index + 1)
  }

  return false
}

export function selectiveLogicActive(
  selectiveLogic: 0 | 1 | 2 | 3,
  matchedSecondaries: number,
  totalSecondaries: number,
): boolean {
  if (totalSecondaries === 0) return true

  switch (selectiveLogic) {
    case 0:
      return matchedSecondaries >= 1
    case 1:
      return matchedSecondaries < totalSecondaries
    case 2:
      return matchedSecondaries === 0
    case 3:
      return matchedSecondaries === totalSecondaries
    default:
      return false
  }
}

const matchesAny = (
  text: string,
  keys: readonly string[],
  entry: LorebookActivationEntry,
): number => {
  const opts: MatchOptions = {
    caseSensitive: entry.caseSensitive,
    wholeWords: entry.wholeWords,
  }
  return keys.reduce(
    (matched, key) => (matchesKey(text, key, opts) ? matched + 1 : matched),
    0,
  )
}

const isEntryActive = (
  entry: LorebookActivationEntry,
  scanText: string,
): boolean => {
  if (entry.constant) return true

  const primaryMatched = matchesAny(scanText, entry.keys, entry) > 0
  if (!primaryMatched) return false
  if (!entry.selective) return true
  if (entry.secondaryKeys.length === 0) return true

  const matchedSecondaries = matchesAny(scanText, entry.secondaryKeys, entry)
  return selectiveLogicActive(
    entry.selectiveLogic,
    matchedSecondaries,
    entry.secondaryKeys.length,
  )
}

const injectedText = (entry: LorebookActivationEntry): string =>
  stripDecorators(entry.content)

const isHardSkipped = (entry: LorebookActivationEntry): boolean =>
  entry.content.trim() === "" || !entry.enabled || entry.useRegex

const compareInjectionOrder = (
  a: LorebookActivationEntry,
  b: LorebookActivationEntry,
): number => a.insertionOrder - b.insertionOrder || a.order - b.order

const compareBudgetPriority = (
  a: LorebookActivationEntry,
  b: LorebookActivationEntry,
): number =>
  b.priority - a.priority || a.insertionOrder - b.insertionOrder

export function activateLorebookEntries(
  input: LorebookActivationInput,
): LorebookActivationResult {
  const eligible: LorebookActivationEntry[] = []
  let skipped = 0

  for (const entry of input.entries) {
    if (isHardSkipped(entry)) {
      skipped++
      continue
    }
    eligible.push(entry)
  }

  const included = new Map<string, LorebookActivationEntry>()
  for (const entry of eligible) {
    if (isEntryActive(entry, input.scanText)) {
      included.set(entry.id, entry)
    }
  }

  if (input.recursiveScanning) {
    let frontier = Array.from(included.values())
      .map(injectedText)
      .filter((text) => text.trim() !== "")

    let depth = 0
    while (depth < MAX_LOREBOOK_RECURSION_DEPTH && frontier.length > 0) {
      const scanText = frontier.join("\n")
      const newlyIncluded: LorebookActivationEntry[] = []

      for (const entry of eligible) {
        if (included.has(entry.id)) continue
        if (isEntryActive(entry, scanText)) {
          included.set(entry.id, entry)
          newlyIncluded.push(entry)
        }
      }

      frontier = newlyIncluded
        .map(injectedText)
        .filter((text) => text.trim() !== "")
      depth++
    }
  }

  let activated = Array.from(included.values())
  let overBudgetCount = 0

  if (input.tokenBudget > 0) {
    const total = activated.reduce(
      (sum, entry) => sum + estimateTextTokens(injectedText(entry)),
      0,
    )

    if (total > input.tokenBudget) {
      const kept: LorebookActivationEntry[] = []
      let used = 0

      for (const entry of [...activated].sort(compareBudgetPriority)) {
        const cost = estimateTextTokens(injectedText(entry))
        if (used + cost <= input.tokenBudget) {
          kept.push(entry)
          used += cost
        } else {
          overBudgetCount++
        }
      }
      activated = kept
    }
  }

  activated.sort(compareInjectionOrder)

  return { included: activated, overBudgetCount, skipped }
}
