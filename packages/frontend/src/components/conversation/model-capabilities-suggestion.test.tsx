import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { ModelCapabilitiesResult } from "@workspace/shared/types/model-capabilities"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

import { ModelCapabilitiesSuggestion } from "./model-capabilities-suggestion"

vi.mock("@/lib/api/providers", () => ({
  getModelCapabilities: vi.fn(),
  getModelContextWindow: vi.fn(),
}))

const result: ModelCapabilitiesResult = {
  id: "openai-compatible",
  model: "gpt-4o-mini",
  capabilities: {
    identity: {
      provider: "openai-compatible",
      instanceId: null,
      normalizedModel: "gpt-4o-mini",
    },
    contextWindow: 8_192,
    contextWindowSource: "curated-table",
    contextWindowConfidence: "medium",
    maxOutputTokens: 4_096,
    maxOutputTokensSource: "curated-table",
    maxOutputTokensConfidence: "medium",
    confidence: "medium",
    warnings: [],
  },
  workingWindow: {
    status: "ok",
    contextWindow: 8_192,
    outputReserve: 2_048,
    safetyMargin: 409,
    workingWindow: 5_735,
    warnings: [],
  },
}

const unknownResult: ModelCapabilitiesResult = {
  ...result,
  workingWindow: {
    ...result.workingWindow,
    status: "unknown",
    workingWindow: null,
  },
}

const infeasibleResult: ModelCapabilitiesResult = {
  ...result,
  workingWindow: {
    ...result.workingWindow,
    status: "infeasible",
    workingWindow: 0,
  },
}

interface RenderOptions {
  capabilities?: ModelCapabilitiesResult
  onApply?: (workingWindow: number | null) => void
  typedContextWindow?: number | null
}

const renderSuggestion = ({
  capabilities = result,
  onApply = vi.fn(),
  typedContextWindow = null,
}: RenderOptions = {}) =>
  render(
    <I18nProvider initialLocale="en">
      <ModelCapabilitiesSuggestion
        capabilities={capabilities}
        loading={false}
        typedContextWindow={typedContextWindow}
        onApply={onApply}
      />
    </I18nProvider>
  )

afterEach(cleanup)

describe("ModelCapabilitiesSuggestion", () => {
  it("shows the resolved window, its provenance, confidence and the safe working window", () => {
    renderSuggestion()

    expect(document.body).toHaveTextContent(/curated/i)
    expect(document.body).toHaveTextContent(/medium/i)
    expect(document.body).toHaveTextContent(/8[.,]?2\s?k|8[,.]?192/i)
    expect(document.body).toHaveTextContent(/4[.,]?1\s?k|4[,.]?096/i)
    expect(document.body).toHaveTextContent(/5[.,]?7\s?k|5[,.]?735/i)
  })

  it("applies the safe working window, not the raw window or max output", async () => {
    const onApply = vi.fn()
    renderSuggestion({ onApply })

    await userEvent.click(screen.getByRole("button", { name: /apply/i }))

    expect(onApply).toHaveBeenCalledWith(5_735)
    expect(onApply).not.toHaveBeenCalledWith(8_192)
    expect(onApply).not.toHaveBeenCalledWith(4_096)
  })

  it("does not apply an unknown working window", async () => {
    const onApply = vi.fn()
    renderSuggestion({ capabilities: unknownResult, onApply })

    const button = screen.getByRole("button", { name: /apply/i })

    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onApply).not.toHaveBeenCalled()
  })

  it("does not apply an infeasible working window", async () => {
    const onApply = vi.fn()
    renderSuggestion({ capabilities: infeasibleResult, onApply })

    const button = screen.getByRole("button", { name: /apply/i })

    expect(button).toBeDisabled()
    expect(document.body).toHaveTextContent(
      /reply budget does not fit inside the context window/i
    )
    await userEvent.click(button)
    expect(onApply).not.toHaveBeenCalled()
  })
})
