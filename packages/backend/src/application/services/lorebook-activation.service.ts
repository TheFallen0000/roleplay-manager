import {
  activateLorebookEntries,
  type LorebookActivationEntry,
} from "@workspace/shared/lib/lorebook-activation"

export interface LorebookActivationBook {
  scanDepth: number
  tokenBudget: number
  recursiveScanning: boolean
}

export interface LorebookActivationMessage {
  role: string
  content: string
}

export interface LorebookActivationEntryInput {
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
  order: number
  position: "before_char" | "after_char"
  /** Some callers already carry the flag; domain entries keep it in unknownFields. */
  useRegex?: boolean
  unknownFields?: unknown
}

export interface LorebookActivationServiceInput<
  TEntry extends LorebookActivationEntryInput,
> {
  book: LorebookActivationBook
  entries: TEntry[]
  messages: LorebookActivationMessage[]
  pendingMessage?: LorebookActivationMessage
}

export interface LorebookActivationServiceResult<
  TEntry extends LorebookActivationEntryInput,
> {
  before: TEntry[]
  after: TEntry[]
  overBudgetCount: number
}

const useRegexOf = (
  unknownFields: unknown,
  fallback: boolean | undefined,
): boolean => {
  if (typeof unknownFields === "object" && unknownFields !== null) {
    const fields = unknownFields as Record<string, unknown>
    if (typeof fields.use_regex === "boolean") return fields.use_regex
    if (typeof fields.useRegex === "boolean") return fields.useRegex
  }
  return fallback === true
}

const toActivationEntry = (
  entry: LorebookActivationEntryInput,
): LorebookActivationEntry => ({
  id: entry.id,
  keys: entry.keys,
  secondaryKeys: entry.secondaryKeys,
  content: entry.content,
  constant: entry.constant,
  selective: entry.selective,
  selectiveLogic: entry.selectiveLogic,
  insertionOrder: entry.insertionOrder,
  priority: entry.priority,
  enabled: entry.enabled,
  caseSensitive: entry.caseSensitive,
  wholeWords: entry.wholeWords,
  useRegex: useRegexOf(entry.unknownFields, entry.useRegex),
  order: entry.order,
  position: entry.position,
})

const buildScanText = (
  messages: LorebookActivationMessage[],
  pendingMessage: LorebookActivationMessage | undefined,
  scanDepth: number,
): string => {
  const depth = Math.max(0, Math.floor(scanDepth))
  if (depth === 0) return ""

  const window = pendingMessage ? [...messages, pendingMessage] : messages
  return window
    .slice(-depth)
    .map((message) => message.content)
    .join("\n")
}

/**
 * Resolves which lorebook entries apply to a scan window. The pure helper owns
 * activation, budget and recursion; this service only shapes the input and maps
 * the result back to the original entries.
 */
export class LorebookActivationService {
  async activate<TEntry extends LorebookActivationEntryInput>(
    input: LorebookActivationServiceInput<TEntry>,
  ): Promise<LorebookActivationServiceResult<TEntry>> {
    const mapped = input.entries.map(toActivationEntry)
    const originalById = new Map(input.entries.map((entry) => [entry.id, entry]))

    const result = activateLorebookEntries({
      entries: mapped,
      scanText: buildScanText(
        input.messages,
        input.pendingMessage,
        input.book.scanDepth,
      ),
      tokenBudget: input.book.tokenBudget,
      recursiveScanning: input.book.recursiveScanning,
    })

    const activated = result.included
      .map((entry) => originalById.get(entry.id))
      .filter((entry): entry is TEntry => entry !== undefined)

    return {
      before: activated.filter((entry) => entry.position === "before_char"),
      after: activated.filter((entry) => entry.position === "after_char"),
      overBudgetCount: result.overBudgetCount,
    }
  }
}
