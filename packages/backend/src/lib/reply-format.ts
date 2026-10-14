/**
 * Output guardrails for generated roleplay replies. Models drift into
 * "assistant mode" (Markdown headings, bullet lists, emojis) and pad their
 * messages with blank lines; these helpers clean what reaches the chat without
 * touching the `*action*` convention.
 */

const LINE_BREAKS = /\r\n?/g

/** Collapses whitespace noise: CRLF, edge padding, trailing spaces, 3+ breaks. */
export const normalizeWhitespace = (content: string): string =>
  content
    .replace(LINE_BREAKS, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

/** `**bold**` is Markdown, never part of the action convention: unwrap it. */
const BOLD = /\*\*([^*\n]+)\*\*/g

const HEADING = /^(\s*)#{1,6}[ \t]+/
const DASH_BULLET = /^(\s*)[-+][ \t]+/
const STAR_BULLET = /^(\s*)\*[ \t]+/

export const stripMarkdownArtifacts = (content: string): string =>
  content
    .replace(BOLD, "$1")
    .split("\n")
    .map((line) => {
      let next = line.replace(HEADING, "$1").replace(DASH_BULLET, "$1")
      // A lone `*` starts a Markdown bullet; two or more belong to actions.
      if ((next.match(/\*/g) ?? []).length === 1) {
        next = next.replace(STAR_BULLET, "$1")
      }
      return next
    })
    .join("\n")

/**
 * Emoji building blocks: pictographs, flags (regional indicators), skin-tone
 * modifiers and the joiners/selectors that glue sequences together
 * (`\u{FE0F}`, `\u{200D}`, keycaps and tag characters). Written as an
 * alternation so each code point is matched individually.
 */
const EMOJI_SOURCE =
  "(?:\\p{Extended_Pictographic}|\\p{Regional_Indicator}|\\p{Emoji_Modifier}|\\u{FE0F}|\\u{200D}|\\u{20E3}|[\\u{E0020}-\\u{E007F}])"
const HAS_EMOJI = new RegExp(EMOJI_SOURCE, "u")
const EMOJI = new RegExp(EMOJI_SOURCE, "gu")

export const stripEmojis = (content: string): string => {
  // Nothing to do (and nothing else to touch) when there are no emojis.
  if (!HAS_EMOJI.test(content)) return content
  // Collapse the padding the removed sequences leave behind.
  return content
    .replace(EMOJI, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
}

/**
 * The emoji ban is opt-out: mention emojis in the character's Instructions
 * (e.g. "uses emojis when excited") and the cleanup leaves them alone.
 */
export const mentionsEmojis = (
  instructions: string | null | undefined,
): boolean => /emoji|emoticono/i.test(instructions ?? "")

export interface ReplyFormatOptions {
  /** Character instructions opted out of the emoji ban. */
  allowEmojis?: boolean
}

/** Guardrails applied to every generated reply before it is stored. */
export const normalizeAssistantReply = (
  content: string,
  options: ReplyFormatOptions = {},
): string => {
  const withoutMarkdown = stripMarkdownArtifacts(content)
  const withoutEmojis = options.allowEmojis
    ? withoutMarkdown
    : stripEmojis(withoutMarkdown)
  return normalizeWhitespace(withoutEmojis)
}

/** User text keeps its content: only whitespace is tidied. */
export const normalizeUserContent = (content: string): string =>
  normalizeWhitespace(content)
