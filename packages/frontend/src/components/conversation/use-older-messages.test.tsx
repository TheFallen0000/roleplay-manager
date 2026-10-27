import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"

import type { MessageDTO } from "@workspace/shared/types/message"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useChatStore } from "@/lib/stores/chat.store"
import { useOlderMessages } from "./use-older-messages"

const mocks = vi.hoisted(() => ({
  getConversationMessages: vi.fn(),
}))

vi.mock("@/lib/api/conversations", () => ({
  getConversationMessages: mocks.getConversationMessages,
}))

const message = (id: string, position: number): MessageDTO => ({
  id,
  conversationId: "conv-1",
  role: "assistant",
  content: `Message ${id}`,
  position,
  alternatives: [],
  alternativesCursor: 0,
  createdAt: "2026-10-27T12:00:00.000Z",
  editedAt: null,
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider initialLocale="es">{children}</I18nProvider>
)

describe("useOlderMessages", () => {
  beforeEach(() => {
    useChatStore.getState().reset()
    mocks.getConversationMessages.mockReset()
  })

  it("loads the previous page and prepends it", async () => {
    useChatStore.getState().setMessages([message("m3", 2)], {
      hasMore: true,
      nextCursor: 2,
    })
    mocks.getConversationMessages.mockResolvedValue({
      messages: [message("m1", 0), message("m2", 1)],
      hasMore: false,
      nextCursor: null,
    })

    const { result } = renderHook(() => useOlderMessages("conv-1"), { wrapper })
    await act(async () => {
      await result.current.loadOlder()
    })

    expect(mocks.getConversationMessages).toHaveBeenCalledWith("conv-1", {
      before: 2,
      limit: 50,
    })
    expect(useChatStore.getState().messages.map((item) => item.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ])
    expect(useChatStore.getState().hasMoreMessages).toBe(false)
  })

  it("shows an error and allows retrying when the request fails", async () => {
    useChatStore.getState().setMessages([message("m3", 2)], {
      hasMore: true,
      nextCursor: 2,
    })
    mocks.getConversationMessages.mockRejectedValue(new Error("offline"))

    const { result } = renderHook(() => useOlderMessages("conv-1"), { wrapper })
    await act(async () => {
      await result.current.loadOlder()
    })

    await waitFor(() => {
      expect(useChatStore.getState().loadOlderError).toBe(
        "No se pudieron cargar los mensajes anteriores.",
      )
    })
    expect(useChatStore.getState().isLoadingOlder).toBe(false)
    expect(useChatStore.getState().hasMoreMessages).toBe(true)
  })

  it("does nothing when there is no cursor", async () => {
    useChatStore.getState().setMessages([message("m1", 0)], {
      hasMore: false,
      nextCursor: null,
    })

    const { result } = renderHook(() => useOlderMessages("conv-1"), { wrapper })
    await act(async () => {
      await result.current.loadOlder()
    })

    expect(mocks.getConversationMessages).not.toHaveBeenCalled()
  })
})
