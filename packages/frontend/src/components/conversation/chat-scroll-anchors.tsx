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
  const { scrollToEnd } = useMessageScroller()

  useEffect(() => {
    if (!lastMessageId) return
    const frame = requestAnimationFrame(() => {
      scrollToEnd({ align: "end", behavior: "instant" })
    })
    return () => cancelAnimationFrame(frame)
  }, [lastMessageId, scrollToEnd])

  return null
}

/**
 * Loads older messages only when the user crosses the top threshold. Starting
 * from `start` avoids an extra request on mount, before the chat is anchored.
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

  useEffect(() => {
    if (start && !previousStart.current && enabled && !loading) {
      onLoad()
    }
    previousStart.current = start
  }, [enabled, loading, onLoad, start])

  return null
}
