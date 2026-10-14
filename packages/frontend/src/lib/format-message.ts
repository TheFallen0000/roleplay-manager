import {
  OOC_REGEX_SOURCE,
  extractOocInner,
} from "@workspace/shared/lib/ooc-parser"

export type MessageSegmentType = "dialogue" | "action" | "ooc"

export interface MessageSegment {
  type: MessageSegmentType
  content: string
}

const ACTION_REGEX = /\*[^*\n]+\*/g
const OOC_REGEX = new RegExp(OOC_REGEX_SOURCE, "g")

export function parseMessage(content: string): MessageSegment[] {
  // Legacy rows and live streams may still carry padded edges: never show them.
  const text = content ? content.replace(/\r\n?/g, "\n").trim() : ""
  if (!text) {
    return []
  }

  const segments: MessageSegment[] = []
  const actionRegex = new RegExp(ACTION_REGEX.source, "g")
  const oocRegex = new RegExp(OOC_REGEX.source, "g")
  const matches: Array<{ start: number; end: number; type: "action" | "ooc"; inner: string }> = []

  let match: RegExpExecArray | null
  while ((match = actionRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: actionRegex.lastIndex,
      type: "action",
      inner: match[0].slice(1, -1),
    })
  }

  while ((match = oocRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: oocRegex.lastIndex,
      type: "ooc",
      inner: extractOocInner(match[0]),
    })
  }

  matches.sort((a, b) => a.start - b.start)

  let lastIndex = 0
  for (const m of matches) {
    if (m.start > lastIndex) {
      const before = text.slice(lastIndex, m.start)
      if (before) segments.push({ type: "dialogue", content: before })
    }
    if (m.type === "ooc") {
      if (m.inner.length > 0) {
        segments.push({ type: "ooc", content: m.inner })
      }
    } else {
      segments.push({ type: "action", content: m.inner })
    }
    lastIndex = m.end
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    if (remaining) segments.push({ type: "dialogue", content: remaining })
  }

  if (segments.length === 0) {
    segments.push({ type: "dialogue", content: text })
  }

  return segments
}
