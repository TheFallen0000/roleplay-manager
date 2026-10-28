import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useChatStore } from "@/lib/stores/chat.store"
import { CompactionStatus } from "./compaction-status"

const renderStatus = (contextWindow: number | null) =>
  render(
    <I18nProvider initialLocale="en">
      <CompactionStatus contextWindow={contextWindow} />
    </I18nProvider>,
  )

beforeEach(() => {
  useChatStore.setState({ compacting: false, contextWarning: null })
})

afterEach(() => {
  cleanup()
  useChatStore.setState({ compacting: false, contextWarning: null })
})

describe("CompactionStatus", () => {
  it("shows the compaction progress", () => {
    useChatStore.setState({ compacting: true })
    renderStatus(8_000)

    expect(screen.getByText("Compacting context…")).toBeTruthy()
  })

  it("shows a trimming warning with a dismiss button", () => {
    useChatStore.setState({ contextWarning: "Old messages were trimmed." })
    renderStatus(8_000)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Old messages were trimmed.",
    )
    expect(
      screen.getByRole("button", { name: "Dismiss warning" }),
    ).toBeTruthy()
  })

  it("warns when the context window is unknown", () => {
    renderStatus(null)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Context window unknown.",
    )
  })

  it("renders nothing when there is nothing to report", () => {
    const { container } = renderStatus(8_000)
    expect(container).toBeEmptyDOMElement()
  })
})
