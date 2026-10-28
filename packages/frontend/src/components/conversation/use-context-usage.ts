import { useCallback, useEffect, useMemo, useState } from "react"

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

  const refresh = useCallback(async () => {
    try {
      setMetadata(await getContextStats(conversationId))
    } catch {
      // The indicator is informative: a failure must not interrupt the chat.
      setMetadata(null)
    }
  }, [conversationId])

  useEffect(() => {
    let cancelled = false
    void getContextStats(conversationId)
      .then((next) => {
        if (!cancelled) setMetadata(next)
      })
      .catch(() => {
        if (!cancelled) setMetadata(null)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, refreshKey])

  const draftTokens = useMemo(
    () => (draft.trim().length > 0 ? estimateTextTokens(draft.trim()) + 4 : 0),
    [draft],
  )

  return { metadata, draftTokens, setDraft, refresh }
}
