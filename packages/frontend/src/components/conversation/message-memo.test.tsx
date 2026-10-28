import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { I18nProvider } from "../../lib/hooks/i18n-provider"
import { MessageBubble } from "./message"

const { parseMessage } = vi.hoisted(() => ({
  parseMessage: vi.fn(() => [{ type: "dialogue" as const, content: "Hola" }]),
}))

vi.mock("../../lib/format-message", () => ({ parseMessage }))

const message = {
  id: "memo-1",
  role: "user" as const,
  content: "Hola",
  position: 0,
  createdAt: "",
  alternatives: [],
  alternativesCursor: 0,
}

function Wrapper() {
  const [count, setCount] = useState(0)

  return (
    <>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        rerender {count}
      </button>
      <MessageBubble message={message} />
    </>
  )
}

describe("MessageBubble memoization", () => {
  it("does not re-parse an unchanged message when its parent re-renders", async () => {
    parseMessage.mockClear()

    render(
      <I18nProvider initialLocale="en">
        <Wrapper />
      </I18nProvider>,
    )

    expect(parseMessage).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole("button"))

    expect(parseMessage).toHaveBeenCalledTimes(1)
  })
})
