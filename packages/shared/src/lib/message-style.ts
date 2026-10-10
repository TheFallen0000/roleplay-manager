import type { MessageStyle } from "../types/conversation"

export const MESSAGE_STYLES: MessageStyle[] = ["bubble", "document", "novel"]

export function isMessageStyle(value: unknown): value is MessageStyle {
  return (
    typeof value === "string" && (MESSAGE_STYLES as string[]).includes(value)
  )
}

/** Falls back to the default style for legacy files with missing or bad values. */
export function normalizeMessageStyle(value: unknown): MessageStyle {
  return isMessageStyle(value) ? value : "bubble"
}
