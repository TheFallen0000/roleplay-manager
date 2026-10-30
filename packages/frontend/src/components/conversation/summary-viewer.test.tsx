import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ApiClientError } from "@/lib/api/client"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { SummaryViewer } from "./summary-viewer"

const mocks = vi.hoisted(() => {
  const summary = {
    id: "sum-1",
    conversationId: "conv-1",
    content: "Resumen de prueba.",
    firstMessageId: "msg-1",
    lastMessageId: "msg-2",
    model: "hui-hui-qwen3-30b-a3b-instruct-2507-abliterated",
    provider: "ollama",
    createdAt: "2026-10-29T12:00:00.000Z",
    editedAt: null,
  }
  return {
    summary,
    state: {
      summaries: [summary],
      loading: false,
      loadSummaries: vi.fn(async () => {}),
      generateSummary: vi.fn(),
      updateSummary: vi.fn(),
      deleteSummary: vi.fn(),
    },
  }
})

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

vi.mock("@workspace/ui/components/sonner", () => ({ toast: toastMocks }))

vi.mock("@/lib/stores/summary.store", () => ({
  useSummaryStore: (selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}))

const renderViewer = (onSummaryChanged = vi.fn()) =>
  render(
    <I18nProvider initialLocale="es">
      <SummaryViewer
        conversationId="conv-1"
        onSummaryChanged={onSummaryChanged}
      />
    </I18nProvider>,
  )

beforeEach(() => {
  mocks.state.generateSummary.mockReset()
  toastMocks.success.mockReset()
  toastMocks.warning.mockReset()
  toastMocks.error.mockReset()
  mocks.state.generateSummary.mockResolvedValue({
    summary: {
      id: "sum-2",
      conversationId: "conv-1",
      content: "Nuevo resumen.",
      firstMessageId: "msg-1",
      lastMessageId: "msg-2",
      model: "model",
      provider: "ollama",
      createdAt: "2026-10-29T12:00:00.000Z",
      editedAt: null,
    },
  })
})

afterEach(cleanup)

describe("SummaryViewer", () => {
  it("stacks the card header and lets the model name truncate on mobile", () => {
    renderViewer()

    const button = screen.getByRole("button", {
      name: "Generar resumen ahora",
    })
    expect(button.className).toContain("w-full")

    const model = screen.getByText(mocks.summary.model)
    expect(model.className).toContain("truncate")
    expect(model.parentElement?.className).toContain("flex-col")
  })

  it("warns instead of erroring when there is nothing new to summarize", async () => {
    mocks.state.generateSummary.mockRejectedValueOnce(
      new ApiClientError(400, "NO_NEW_MESSAGES", "No messages to summarize"),
    )
    const onSummaryChanged = vi.fn()
    renderViewer(onSummaryChanged)

    await userEvent.click(
      screen.getByRole("button", { name: "Generar resumen ahora" }),
    )

    await waitFor(() => {
      expect(toastMocks.warning).toHaveBeenCalledWith(
        "Todavía no hay mensajes nuevos que resumir.",
      )
      expect(toastMocks.error).not.toHaveBeenCalled()
      expect(onSummaryChanged).not.toHaveBeenCalled()
    })
  })

  it("refreshes the context usage after a manual summary", async () => {
    const onSummaryChanged = vi.fn()
    renderViewer(onSummaryChanged)

    await userEvent.click(
      screen.getByRole("button", { name: "Generar resumen ahora" }),
    )

    await waitFor(() => {
      expect(mocks.state.generateSummary).toHaveBeenCalledWith("conv-1")
      expect(onSummaryChanged).toHaveBeenCalledTimes(1)
    })
  })
})
