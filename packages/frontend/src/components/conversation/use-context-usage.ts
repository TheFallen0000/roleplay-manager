import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { PromptContextMetadataDTO } from "@workspace/shared/types/context"
import { estimateTextTokens } from "@workspace/shared/lib/token-estimate"

import { getContextStats } from "@/lib/api/context"

/**
 * Live context usage for the chat header. The draft lives here so the
 * percentage reacts to what the user is writing, not just to sent messages.
 */
export function useContextUsage(conversationId: string, refreshKey: string) {
  const [metadata, setMetadata] = useState<PromptContextMetadataDTO | null>(
    null,
  )
  const [draft, setDraft] = useState("")
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    try {
      const next = await getContextStats(conversationId)
      if (id === requestId.current) setMetadata(next)
    } catch {
      // The indicator is informative: a failure must not interrupt the chat.
      if (id === requestId.current) setMetadata(null)
    }
  }, [conversationId])

  useEffect(() => {
    const id = ++requestId.current
    void getContextStats(conversationId)
      .then((next) => {
        if (id === requestId.current) setMetadata(next)
      })
      .catch(() => {
        if (id === requestId.current) setMetadata(null)
      })
    return () => {
      requestId.current += 1
    }
  }, [conversationId, refreshKey])

  const draftTokens = useMemo(
    () => (draft.trim().length > 0 ? estimateTextTokens(draft.trim()) + 4 : 0),
    [draft],
  )

  return { metadata, draftTokens, setDraft, refresh }
}
