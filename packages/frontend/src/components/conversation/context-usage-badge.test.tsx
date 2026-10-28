import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type * as React from "react"

import type { PromptContextMetadataDTO } from "@workspace/shared/types/context"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ContextUsageBadge } from "./context-usage-badge"

const metadata = (
  overrides: Partial<PromptContextMetadataDTO> = {},
): PromptContextMetadataDTO => ({
  characterName: "Test",
  characterVersion: 1,
  summaryId: null,
  memoryCount: 0,
  recentMessageCount: 10,
  totalContextMessages: 10,
  totalCharacters: 0,
  systemTokens: 500,
  messageTokens: 500,
  inputTokens: 1_000,
  outputReserve: 200,
  totalTokens: 1_200,
  contextWindow: 10_000,
  contextPercent: 12,
  ...overrides,
})

const renderBadge = (
  props: Partial<React.ComponentProps<typeof ContextUsageBadge>> = {},
) =>
  render(
    <I18nProvider initialLocale="en">
      <ContextUsageBadge metadata={metadata()} draftTokens={0} {...props} />
    </I18nProvider>,
  )

describe("ContextUsageBadge", () => {
  it("shows the live percentage including the draft", () => {
    renderBadge({ draftTokens: 300 })

    expect(screen.getByText("15%")).toBeTruthy()
    expect(
      screen.getByLabelText(
        "Estimated context: 1.5k of 10k tokens (15%)",
      ),
    ).toBeTruthy()
  })

  it("shows the estimated tokens when the window is unknown", () => {
    renderBadge({
      metadata: metadata({ contextWindow: null, contextPercent: null }),
      draftTokens: 300,
    })

    expect(screen.getByText("~1.5k")).toBeTruthy()
    expect(
      screen.getByLabelText(
        "Estimated context: 1.5k tokens. Context window unknown.",
      ),
    ).toBeTruthy()
  })

  it("marks a nearly full context", () => {
    renderBadge({
      metadata: metadata({ contextWindow: 1_400, contextPercent: 86 }),
    })

    expect(screen.getByText("86%")).toBeTruthy()
    expect(screen.getByText("86%").className).toContain("amber")
  })
})
