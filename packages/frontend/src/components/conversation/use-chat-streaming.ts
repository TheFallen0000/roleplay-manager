import { useCallback, useEffect, useRef } from "react"

import {
  sendMessageStreaming,
  regenerateReplyStreaming,
  continueConversationStreaming,
} from "@/lib/api/conversations"
import type { MessageDTO } from "@workspace/shared/types/message"
import type { TitleSource } from "@workspace/shared/types/conversation"
import { useChatStore } from "@/lib/stores/chat.store"

export interface UseChatStreamingOptions {
  onDone?: () => void
  onError?: () => void
  onTitleGenerated?: (title: string, titleSource: TitleSource) => void
  onSummaryGenerated?: () => void
}

export function useChatStreaming(convId: string, options?: UseChatStreamingOptions) {
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  const addMessage = useChatStore((s) => s.addMessage)
  const replaceMessage = useChatStore((s) => s.replaceMessage)
  const appendToStreamingContent = useChatStore((s) => s.appendToStreamingContent)
  const setStreaming = useChatStore((s) => s.setStreaming)
  const setCompacting = useChatStore((s) => s.setCompacting)
  const setContextWarning = useChatStore((s) => s.setContextWarning)
  const setStreamingContent = useChatStore((s) => s.setStreamingContent)
  const setError = useChatStore((s) => s.setError)
  const setRegeneratingMessageId = useChatStore((s) => s.setRegeneratingMessageId)

  const handleSend = useCallback(
    async (content: string) => {
      setError(null)
      setStreaming(true)
      setStreamingContent("")
      setCompacting(false)
      setContextWarning(null)

      await sendMessageStreaming(convId, content, {
        onSaved: (message) => {
          addMessage(message)
        },
        onChunk: (chunk) => {
          appendToStreamingContent(chunk)
        },
        onDone: (message) => {
          addMessage(message)
          setStreamingContent("")
          setStreaming(false)
          setCompacting(false)
          optionsRef.current?.onDone?.()
        },
        onTitleGenerated: (title, titleSource) => {
          optionsRef.current?.onTitleGenerated?.(title, titleSource)
        },
        onSummaryGenerated: () => {
          optionsRef.current?.onSummaryGenerated?.()
        },
        onCompacting: () => {
          setCompacting(true)
        },
        onContextWarning: (warning) => {
          setContextWarning(warning.message)
        },
        onError: (err) => {
          setError(err.message)
          setStreaming(false)
          setStreamingContent("")
          setCompacting(false)
          optionsRef.current?.onError?.()
        },
      })
    },
    [convId, addMessage, setError, setStreaming, setStreamingContent, appendToStreamingContent, setCompacting, setContextWarning],
  )

  const handleContinue = useCallback(async () => {
    setError(null)
    setStreaming(true)
    setStreamingContent("")
    setCompacting(false)
    setContextWarning(null)

    await continueConversationStreaming(convId, {
      onChunk: (chunk) => {
        appendToStreamingContent(chunk)
      },
      onDone: (message) => {
        addMessage(message)
        setStreamingContent("")
        setStreaming(false)
        setCompacting(false)
        optionsRef.current?.onDone?.()
      },
      onSummaryGenerated: () => {
        optionsRef.current?.onSummaryGenerated?.()
      },
      onCompacting: () => {
        setCompacting(true)
      },
      onContextWarning: (warning) => {
        setContextWarning(warning.message)
      },
      onError: (err) => {
        setError(err.message)
        setStreaming(false)
        setStreamingContent("")
        setCompacting(false)
        optionsRef.current?.onError?.()
      },
    })
  }, [convId, addMessage, setError, setStreaming, setStreamingContent, appendToStreamingContent, setCompacting, setContextWarning])

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      setError(null)
      setRegeneratingMessageId(messageId)
      setStreaming(true)
      setStreamingContent("")
      setCompacting(false)
      setContextWarning(null)

      await regenerateReplyStreaming(convId, messageId, {
        onChunk: (chunk) => {
          appendToStreamingContent(chunk)
        },
        onDone: (message: MessageDTO) => {
          replaceMessage(messageId, message)
          setRegeneratingMessageId(null)
          setStreamingContent("")
          setStreaming(false)
          setCompacting(false)
          optionsRef.current?.onDone?.()
        },
        onSummaryGenerated: () => {
          optionsRef.current?.onSummaryGenerated?.()
        },
        onCompacting: () => {
          setCompacting(true)
        },
        onContextWarning: (warning) => {
          setContextWarning(warning.message)
        },
        onError: (err: { code: string; message: string }) => {
          setError(err.message)
          setRegeneratingMessageId(null)
          setStreaming(false)
          setStreamingContent("")
          setCompacting(false)
          optionsRef.current?.onError?.()
        },
      })
    },
    [convId, replaceMessage, setError, setRegeneratingMessageId, setStreaming, setStreamingContent, appendToStreamingContent, setCompacting, setContextWarning],
  )

  return { handleSend, handleContinue, handleRegenerate }
}
