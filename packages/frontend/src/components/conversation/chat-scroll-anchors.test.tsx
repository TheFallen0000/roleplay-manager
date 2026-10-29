import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"

import { AnchorChatToEnd } from "./chat-scroll-anchors"

const mocks = vi.hoisted(() => ({
  scrollToMessage: vi.fn(),
  scrollToEnd: vi.fn(),
}))

vi.mock("@workspace/ui/components/message-scroller", () => ({
  useMessageScroller: () => ({
    scrollToMessage: mocks.scrollToMessage,
    scrollToEnd: mocks.scrollToEnd,
  }),
  useMessageScrollerScrollable: () => ({ start: false }),
}))

afterEach(() => {
  cleanup()
  mocks.scrollToMessage.mockReset()
  mocks.scrollToEnd.mockReset()
})

describe("AnchorChatToEnd", () => {
  it("aligns the last message, not the scroller spacer", async () => {
    mocks.scrollToMessage.mockReturnValue(true)
    render(<AnchorChatToEnd lastMessageId="msg-1" />)

    await waitFor(() => {
      expect(mocks.scrollToMessage).toHaveBeenCalledWith("msg-1", {
        align: "end",
        behavior: "instant",
      })
    })
    expect(mocks.scrollToEnd).not.toHaveBeenCalled()
  })

  it("falls back to the scroller end when the message is not registered", async () => {
    mocks.scrollToMessage.mockReturnValue(false)
    render(<AnchorChatToEnd lastMessageId="msg-1" />)

    await waitFor(() => {
      expect(mocks.scrollToEnd).toHaveBeenCalledWith({
        align: "end",
        behavior: "instant",
      })
    })
  })
})
