import type {
  ConversationDetail,
  ConversationSettingsUpdate,
  ConversationSummary,
  CreateConversationInput,
  CreateConversationResult,
  TitleSource,
} from "@workspace/shared/types/conversation"
import type { MessageDTO } from "@workspace/shared/types/message"
import type { SummaryDTO } from "@workspace/shared/types/summary"

import { apiRequest, getBaseUrl } from "./client"
import { getRequestLocale } from "../locale"

export const listConversations = (): Promise<ConversationSummary[]> =>
  apiRequest("/api/conversations")

export const getConversation = (id: string): Promise<ConversationDetail> =>
  apiRequest(`/api/conversations/${id}`)

export const createConversation = (
  input: CreateConversationInput,
): Promise<CreateConversationResult> =>
  apiRequest("/api/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  })

export const branchConversation = (
  conversationId: string,
  targetMessageId: string,
): Promise<ConversationDetail> =>
  apiRequest(`/api/conversations/${conversationId}/branches`, {
    method: "POST",
    body: JSON.stringify({ targetMessageId }),
  })

export const setConversationTitle = (
  id: string,
  title?: string,
): Promise<{ title: string; titleSource: TitleSource }> =>
  apiRequest(`/api/conversations/${id}/title`, {
    method: "POST",
    body: JSON.stringify(title ? { title } : {}),
  })

export const updateConversationSettings = (
  id: string,
  settings: ConversationSettingsUpdate,
): Promise<ConversationDetail> =>
  apiRequest(`/api/conversations/${id}/settings`, {
    method: "PATCH",
    body: JSON.stringify(settings),
  })

export const setConversationCustomProfileImage = (
  id: string,
  assetId: string | null,
): Promise<ConversationDetail> =>
  updateConversationSettings(id, { customProfileImageAssetId: assetId })

export const editMessage = (
  conversationId: string,
  messageId: string,
  content: string,
): Promise<MessageDTO> =>
  apiRequest(`/api/conversations/${conversationId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  })

export const deleteMessage = (
  conversationId: string,
  messageId: string,
): Promise<void> =>
  apiRequest(`/api/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
  })

export const rewindConversation = (
  conversationId: string,
  targetMessageId: string,
): Promise<{ messages: MessageDTO[] }> =>
  apiRequest(`/api/conversations/${conversationId}/rewind`, {
    method: "POST",
    body: JSON.stringify({ targetMessageId }),
  })

export const cycleAlternative = (
  conversationId: string,
  messageId: string,
  direction: "prev" | "next",
): Promise<MessageDTO> =>
  apiRequest(`/api/conversations/${conversationId}/messages/${messageId}/cycle`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  })

export interface SendMessageCallbacks {
  onSaved?: (message: MessageDTO) => void
  onChunk: (content: string) => void
  onDone: (message: MessageDTO) => void
  onTitleGenerated?: (title: string, titleSource: TitleSource) => void
  onSummaryGenerated?: (summary: SummaryDTO) => void
  onError: (error: { code: string; message: string }) => void
}

const streamEventSource = async (
  url: string,
  body: object,
  callbacks: SendMessageCallbacks,
): Promise<void> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Accept-Language": getRequestLocale(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const error = data?.error ?? {
      code: "UNKNOWN_ERROR",
      message: response.statusText,
    }
    callbacks.onError(error)
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    let currentEvent = ""
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))

          switch (currentEvent) {
            case "saved": {
              callbacks.onSaved?.(data)
              break
            }
            case "chunk": {
              callbacks.onChunk(data.content)
              break
            }
            case "done": {
              callbacks.onDone(data.message ?? data)
              if (data.title && data.titleSource) {
                callbacks.onTitleGenerated?.(data.title, data.titleSource)
              }
              break
            }
            case "summary-generated": {
              callbacks.onSummaryGenerated?.(data)
              break
            }
            case "error": {
              callbacks.onError(data)
              break
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }
}

export const sendMessageStreaming = (
  conversationId: string,
  content: string,
  callbacks: SendMessageCallbacks,
): Promise<void> =>
  streamEventSource(
    `${getBaseUrl()}/api/conversations/${conversationId}/messages`,
    { content },
    callbacks,
  )

export const regenerateReplyStreaming = (
  conversationId: string,
  messageId: string,
  callbacks: SendMessageCallbacks,
): Promise<void> =>
  streamEventSource(
    `${getBaseUrl()}/api/conversations/${conversationId}/messages/${messageId}/regenerate`,
    {},
    callbacks,
  )

export const continueConversationStreaming = (
  conversationId: string,
  callbacks: SendMessageCallbacks,
): Promise<void> =>
  streamEventSource(
    `${getBaseUrl()}/api/conversations/${conversationId}/continue`,
    {},
    callbacks,
  )
