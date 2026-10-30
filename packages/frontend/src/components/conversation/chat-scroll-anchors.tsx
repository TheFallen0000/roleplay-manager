import { useEffect, useRef } from "react"

import {
  useMessageScroller,
  useMessageScrollerScrollable,
} from "@workspace/ui/components/message-scroller"

/**
 * The scroller's raw end includes the primitive's trailing spacer, so parking
 * it there would leave the last message well above the composer (PM.33).
 * Align the last message's end with the viewport once it changes.
 */
export function AnchorChatToEnd({
  lastMessageId,
}: {
  lastMessageId: string | null
}) {
  const { scrollToEnd, scrollToMessage } = useMessageScroller()

  useEffect(() => {
    if (!lastMessageId) return
    const frame = requestAnimationFrame(() => {
      const moved = scrollToMessage(lastMessageId, {
        align: "end",
        behavior: "instant",
      })
      if (!moved) scrollToEnd({ align: "end", behavior: "instant" })
    })
    return () => cancelAnimationFrame(frame)
  }, [lastMessageId, scrollToEnd, scrollToMessage])

  return null
}

/**
 * Loads older messages when the user comes back to the top. `start` is true
 * once the viewport has scrolled away from the top, so the first true marks
 * the initial anchor; only a later true -> false transition means the user
 * reached the top. This also avoids an extra request on mount.
 */
export function LoadOlderOnScroll({
  enabled,
  loading,
  onLoad,
}: {
  enabled: boolean
  loading: boolean
  onLoad: () => void
}) {
  const { start } = useMessageScrollerScrollable()
  const previousStart = useRef(start)
  const anchored = useRef(false)

  useEffect(() => {
    if (start) anchored.current = true
    if (
      anchored.current &&
      !start &&
      previousStart.current &&
      enabled &&
      !loading
    ) {
      onLoad()
    }
    previousStart.current = start
  }, [enabled, loading, onLoad, start])

  return null
}
