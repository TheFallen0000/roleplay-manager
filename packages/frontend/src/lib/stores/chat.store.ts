import { create } from "zustand"
import type { MessageDTO } from "@workspace/shared/types/message"

export interface MessagePageState {
  hasMore: boolean
  nextCursor: number | null
}

export interface ChatState {
  messages: MessageDTO[]
  hasMoreMessages: boolean
  nextMessageCursor: number | null
  isLoadingOlder: boolean
  loadOlderError: string | null
  isStreaming: boolean
  streamingContent: string
  compacting: boolean
  contextWarning: string | null
  editingMessageId: string | null
  editingContent: string
  regeneratingMessageId: string | null
  error: string | null

  setMessages: (messages: MessageDTO[], page?: MessagePageState) => void
  prependMessages: (messages: MessageDTO[], page: MessagePageState) => void
  setLoadingOlder: (loading: boolean) => void
  setLoadOlderError: (error: string | null) => void
  addMessage: (message: MessageDTO) => void
  replaceMessage: (messageId: string, message: MessageDTO) => void
  removeMessage: (messageId: string) => void
  truncateAfter: (position: number) => void
  appendToStreamingContent: (chunk: string) => void
  setStreamingContent: (content: string) => void
  setStreaming: (isStreaming: boolean) => void
  setCompacting: (compacting: boolean) => void
  setContextWarning: (warning: string | null) => void
  startEditing: (messageId: string, content: string) => void
  setEditingContent: (content: string) => void
  cancelEditing: () => void
  setRegeneratingMessageId: (messageId: string | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

const sortByPosition = (messages: MessageDTO[]): MessageDTO[] =>
  [...messages].sort((a, b) => a.position - b.position)

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  hasMoreMessages: false,
  nextMessageCursor: null,
  isLoadingOlder: false,
  loadOlderError: null,
  isStreaming: false,
  streamingContent: "",
  compacting: false,
  contextWarning: null,
  editingMessageId: null,
  editingContent: "",
  regeneratingMessageId: null,
  error: null,

  setMessages: (messages, page = { hasMore: false, nextCursor: null }) =>
    set({
      messages: sortByPosition(messages),
      hasMoreMessages: page.hasMore,
      nextMessageCursor: page.nextCursor,
      isLoadingOlder: false,
      loadOlderError: null,
      compacting: false,
      contextWarning: null,
      error: null,
    }),

  prependMessages: (messages, page) =>
    set((state) => {
      const byId = new Map(state.messages.map((message) => [message.id, message]))
      for (const message of messages) byId.set(message.id, message)
      return {
        messages: sortByPosition([...byId.values()]),
        hasMoreMessages: page.hasMore,
        nextMessageCursor: page.nextCursor,
        isLoadingOlder: false,
        loadOlderError: null,
      }
    }),

  setLoadingOlder: (isLoadingOlder) => set({ isLoadingOlder }),

  setLoadOlderError: (loadOlderError) => set({ loadOlderError }),

  addMessage: (message) =>
    set((state) => ({
      messages: sortByPosition([...state.messages, message]),
      error: null,
    })),

  replaceMessage: (messageId, message) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === messageId ? message : m)),
      error: null,
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
      error: null,
    })),

  truncateAfter: (position) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.position <= position),
      error: null,
    })),

  appendToStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  setStreamingContent: (content) => set({ streamingContent: content }),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setCompacting: (compacting) => set({ compacting }),

  setContextWarning: (contextWarning) => set({ contextWarning }),

  startEditing: (messageId, content) =>
    set({ editingMessageId: messageId, editingContent: content }),

  setEditingContent: (content) => set({ editingContent: content }),

  cancelEditing: () =>
    set({ editingMessageId: null, editingContent: "" }),

  setRegeneratingMessageId: (messageId) => set({ regeneratingMessageId: messageId }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      messages: [],
      hasMoreMessages: false,
      nextMessageCursor: null,
      isLoadingOlder: false,
      loadOlderError: null,
      isStreaming: false,
      streamingContent: "",
      compacting: false,
      contextWarning: null,
      editingMessageId: null,
      editingContent: "",
      regeneratingMessageId: null,
      error: null,
    }),
}))
