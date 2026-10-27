import { beforeEach, describe, expect, it } from "vitest"

import type { MessageDTO } from "@workspace/shared/types/message"

import { useChatStore } from "./chat.store"

const message = (id: string, position: number): MessageDTO => ({
  id,
  conversationId: "conv-1",
  role: position % 2 === 0 ? "user" : "assistant",
  content: `Message ${id}`,
  position,
  alternatives: [],
  alternativesCursor: 0,
  createdAt: "2026-10-27T12:00:00.000Z",
  editedAt: null,
})

describe("chat store pagination", () => {
  beforeEach(() => {
    useChatStore.getState().reset()
  })

  it("stores the initial page metadata", () => {
    useChatStore.getState().setMessages([message("m2", 1)], {
      hasMore: true,
      nextCursor: 1,
    })

    expect(useChatStore.getState().messages.map((item) => item.id)).toEqual([
      "m2",
    ])
    expect(useChatStore.getState().hasMoreMessages).toBe(true)
    expect(useChatStore.getState().nextMessageCursor).toBe(1)
  })

  it("prepends older messages, sorts them and removes duplicates", () => {
    useChatStore.getState().setMessages([message("m3", 2)], {
      hasMore: true,
      nextCursor: 2,
    })

    useChatStore.getState().prependMessages(
      [message("m1", 0), message("m2", 1), message("m3", 2)],
      { hasMore: false, nextCursor: null },
    )

    expect(useChatStore.getState().messages.map((item) => item.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ])
    expect(useChatStore.getState().hasMoreMessages).toBe(false)
    expect(useChatStore.getState().nextMessageCursor).toBeNull()
    expect(useChatStore.getState().isLoadingOlder).toBe(false)
  })
})
