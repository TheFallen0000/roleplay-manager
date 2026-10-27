import { useCallback, useEffect, useRef } from "react"

import { DEFAULT_MESSAGE_PAGE_SIZE } from "@workspace/shared/types/conversation"

import { getConversationMessages } from "@/lib/api/conversations"
import { useChatStore } from "@/lib/stores/chat.store"
import { useTranslation } from "@/lib/hooks/use-translation"

export function useOlderMessages(conversationId: string) {
  const { t } = useTranslation()
  const hasMore = useChatStore((s) => s.hasMoreMessages)
  const nextCursor = useChatStore((s) => s.nextMessageCursor)
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder)
  const loadOlderError = useChatStore((s) => s.loadOlderError)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setLoadingOlder = useChatStore((s) => s.setLoadingOlder)
  const setLoadOlderError = useChatStore((s) => s.setLoadOlderError)

  const currentConversation = useRef(conversationId)
  const inFlight = useRef(false)

  useEffect(() => {
    currentConversation.current = conversationId
  }, [conversationId])

  const loadOlder = useCallback(async () => {
    if (!hasMore || nextCursor === null || inFlight.current) return

    inFlight.current = true
    setLoadingOlder(true)
    setLoadOlderError(null)
    try {
      const page = await getConversationMessages(conversationId, {
        before: nextCursor,
        limit: DEFAULT_MESSAGE_PAGE_SIZE,
      })
      if (currentConversation.current !== conversationId) return
      prependMessages(page.messages, {
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
      })
    } catch {
      if (currentConversation.current === conversationId) {
        setLoadOlderError(t("chat.loadOlderFailed"))
      }
    } finally {
      inFlight.current = false
      setLoadingOlder(false)
    }
  }, [
    conversationId,
    hasMore,
    nextCursor,
    prependMessages,
    setLoadOlderError,
    setLoadingOlder,
    t,
  ])

  return {
    hasMore,
    isLoadingOlder,
    loadOlderError,
    loadOlder,
  }
}
