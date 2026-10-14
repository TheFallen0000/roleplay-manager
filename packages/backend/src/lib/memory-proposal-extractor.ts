/**
 * The prompt asks for a fenced `memory_proposals` block, but models drift:
 * caps, hyphens or spaces in the label, and a missing closing fence when the
 * response is cut mid-block. Extraction is tolerant to those shapes, plus the
 * most common JSON slips (trailing commas, prose around the array, an object
 * wrapper and lower-cased operations).
 */
const LABEL_SOURCE = "```[ \\t]*memory[ _-]?proposals"

/** Fresh matcher per scan: a `g` regex carries `lastIndex` state. */
const labelRegex = (): RegExp => new RegExp(LABEL_SOURCE, "gi")

/** Index of the fence that closes a block, or -1 while it has not arrived. */
const closingFence = (content: string, contentStart: number): number =>
  content.indexOf("```", contentStart)

export interface RawProposal {
  operation: "CREATE" | "UPDATE" | "DELETE"
  targetMemoryId?: string
  actor: string
  title: string
  description: string
  priority?: number
}

export interface ExtractedProposals {
  cleanedContent: string
  proposals: RawProposal[]
  foundBlock: boolean
}

interface BlockSpan {
  labelStart: number
  contentStart: number
  /** End of the payload (before the closing fence). */
  rawEnd: number
  /** End of the whole block, closing fence included. */
  end: number
}

const findBlockSpans = (content: string): BlockSpan[] => {
  const spans: BlockSpan[] = []
  const regex = labelRegex()
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const labelStart = match.index
    const contentStart = labelStart + match[0].length
    const closing = closingFence(content, contentStart)
    // An unterminated block swallows the rest: the response was cut mid-block.
    spans.push({
      labelStart,
      contentStart,
      rawEnd: closing === -1 ? content.length : closing,
      end: closing === -1 ? content.length : closing + 3,
    })
    regex.lastIndex = closing === -1 ? content.length : closing + 3
  }

  return spans
}

export function extractProposals(content: string): ExtractedProposals {
  const spans = findBlockSpans(content)
  if (spans.length === 0) {
    return { cleanedContent: content, proposals: [], foundBlock: false }
  }

  let cleanedContent = ""
  let cursor = 0
  const proposals: RawProposal[] = []
  for (const span of spans) {
    cleanedContent += content.slice(cursor, span.labelStart)
    cursor = span.end
    proposals.push(
      ...parseBlockContent(content.slice(span.contentStart, span.rawEnd)),
    )
  }
  cleanedContent += content.slice(cursor)

  return { cleanedContent: cleanedContent.trim(), proposals, foundBlock: true }
}

const OPERATIONS = ["CREATE", "UPDATE", "DELETE"] as const
type Operation = (typeof OPERATIONS)[number]

const isOperation = (value: string): value is Operation =>
  (OPERATIONS as readonly string[]).includes(value)

/** First `open…close` span, used when the model wraps the JSON in prose. */
const extractSpan = (
  text: string,
  open: string,
  close: string,
): string | null => {
  const start = text.indexOf(open)
  const end = text.lastIndexOf(close)
  if (start === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    try {
      // Trailing commas are the most common JSON slip from local models.
      return JSON.parse(value.replace(/,\s*([}\]])/g, "$1"))
    } catch {
      return undefined
    }
  }
}

/** The proposal list: directly, or wrapped in an object like `{ "proposals": […] }`. */
const toProposalList = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    const wrapped = Object.values(value).find(Array.isArray)
    if (wrapped) return wrapped
  }
  return null
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const toText = (value: unknown): string => {
  if (typeof value === "string") return value.trim()
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

const normalizeProposal = (item: unknown): RawProposal | null => {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null

  const record = item as Record<string, unknown>
  const operation = toText(record.operation).toUpperCase()
  if (!isOperation(operation)) return null

  const targetMemoryId = toText(record.targetMemoryId)
  return {
    operation,
    targetMemoryId: targetMemoryId || undefined,
    actor: toText(record.actor),
    title: toText(record.title),
    description: toText(record.description),
    priority: toNumber(record.priority),
  }
}

const parseBlockContent = (raw: string): RawProposal[] => {
  const text = raw.trim()
  if (!text) return []

  const candidates = [text]
  const arraySpan = extractSpan(text, "[", "]")
  if (arraySpan && arraySpan !== text) candidates.push(arraySpan)
  const objectSpan = extractSpan(text, "{", "}")
  if (objectSpan && !candidates.includes(objectSpan)) {
    candidates.push(objectSpan)
  }

  for (const candidate of candidates) {
    const list = toProposalList(parseJson(candidate))
    if (list) {
      return list
        .map(normalizeProposal)
        .filter((proposal): proposal is RawProposal => proposal !== null)
    }
  }

  return []
}

export interface CleanStreamState {
  fullContent: string
}

export async function* createCleanStream(
  stream: AsyncIterable<{ content?: string }>,
  state: CleanStreamState,
): AsyncGenerator<{ content: string }> {
  let cursor = 0
  let started = false

  for await (const chunk of stream) {
    if (chunk.content) {
      state.fullContent += chunk.content
    }

    const { visible, nextCursor } = resolveVisible(state.fullContent, cursor)
    cursor = nextCursor
    for (const part of visible) {
      if (!part) continue
      if (started) {
        yield { content: part }
        continue
      }
      // Leading blank lines are padding the chat should never show: hold them
      // back until the reply actually starts.
      const trimmed = part.replace(/^\s+/, "")
      if (!trimmed) continue
      started = true
      yield { content: trimmed }
    }
  }
}

/**
 * Splits the pending content into what can be shown, hiding proposal blocks.
 * A label without its closing fence (a response cut mid-block) hides
 * everything from the label on until more chunks arrive.
 */
const resolveVisible = (
  content: string,
  from: number,
): { visible: string[]; nextCursor: number } => {
  const visible: string[] = []
  let cursor = from
  const regex = labelRegex()
  regex.lastIndex = from
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const contentStart = match.index + match[0].length
    const closing = closingFence(content, contentStart)
    if (closing === -1) {
      visible.push(content.slice(cursor, match.index))
      return { visible, nextCursor: match.index }
    }
    visible.push(content.slice(cursor, match.index))
    cursor = closing + 3
    regex.lastIndex = cursor
  }

  visible.push(content.slice(cursor))
  return { visible, nextCursor: content.length }
}
