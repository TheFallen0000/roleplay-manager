import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"

import {
  AnchorChatToEnd,
  LoadOlderOnScroll,
} from "./chat-scroll-anchors"

const mocks = vi.hoisted(() => ({
  scrollToMessage: vi.fn(),
  scrollToEnd: vi.fn(),
  onLoad: vi.fn(),
  scrollable: { start: false },
}))

vi.mock("@workspace/ui/components/message-scroller", () => ({
  useMessageScroller: () => ({
    scrollToMessage: mocks.scrollToMessage,
    scrollToEnd: mocks.scrollToEnd,
  }),
  useMessageScrollerScrollable: () => mocks.scrollable,
}))

function LoadOlderHarness({ version }: { version: number }) {
  // `version` only forces the parent (and therefore the hook) to re-render.
  void version
  return <LoadOlderOnScroll enabled loading={false} onLoad={mocks.onLoad} />
}

afterEach(() => {
  cleanup()
  mocks.scrollToMessage.mockReset()
  mocks.scrollToEnd.mockReset()
  mocks.onLoad.mockReset()
  mocks.scrollable.start = false
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

describe("LoadOlderOnScroll", () => {
  it("loads when the user returns to the top, not on the initial anchor", async () => {
    const { rerender } = render(<LoadOlderHarness version={0} />)

    mocks.scrollable.start = true
    rerender(<LoadOlderHarness version={1} />)
    expect(mocks.onLoad).not.toHaveBeenCalled()

    mocks.scrollable.start = false
    rerender(<LoadOlderHarness version={2} />)
    await waitFor(() => expect(mocks.onLoad).toHaveBeenCalledTimes(1))

    mocks.scrollable.start = true
    rerender(<LoadOlderHarness version={3} />)
    expect(mocks.onLoad).toHaveBeenCalledTimes(1)

    mocks.scrollable.start = false
    rerender(<LoadOlderHarness version={4} />)
    await waitFor(() => expect(mocks.onLoad).toHaveBeenCalledTimes(2))
  })
})
