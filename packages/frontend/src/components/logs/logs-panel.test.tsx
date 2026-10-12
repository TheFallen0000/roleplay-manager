import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { LogEntryDTO } from "@workspace/shared/types/log"

import { useLogsStore } from "@/lib/stores/logs.store"
import { LogsPanel } from "./logs-panel"

const mocks = vi.hoisted(() => ({
  getRecentLogs: vi.fn(),
  getLogsDownloadUrl: vi.fn(() => "/api/logs/download"),
}))

vi.mock("@/lib/api/logs", () => ({
  getRecentLogs: mocks.getRecentLogs,
  getLogsDownloadUrl: mocks.getLogsDownloadUrl,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

const entries: LogEntryDTO[] = [
  {
    time: "2026-10-12T10:00:00.000Z",
    level: "info",
    message: "request completed",
  },
  {
    time: "2026-10-12T10:00:01.000Z",
    level: "error",
    message: "streaming failed",
    context: { conversationId: "conv-1" },
  },
]

const renderPanel = () => render(<LogsPanel locale="es" />)

beforeEach(() => {
  mocks.getRecentLogs.mockReset()
  mocks.getLogsDownloadUrl.mockClear()
  useLogsStore.setState({ entries: [], refreshing: false })
})

afterEach(() => {
  cleanup()
})

describe("LogsPanel", () => {
  it("renders the entries, their context and the download link", async () => {
    mocks.getRecentLogs.mockResolvedValue({ entries })

    renderPanel()

    expect(await screen.findByText("request completed")).toBeInTheDocument()
    expect(screen.getByText("streaming failed")).toBeInTheDocument()
    expect(screen.getByText("Contexto")).toBeInTheDocument()
    expect(screen.getByText(/conv-1/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Descargar/ })).toHaveAttribute(
      "href",
      "/api/logs/download",
    )
    expect(screen.getByText("2 entradas")).toBeInTheDocument()
    expect(mocks.getRecentLogs).toHaveBeenCalledWith({ limit: 300 })
  })

  it("asks for the chosen level again", async () => {
    mocks.getRecentLogs.mockResolvedValue({ entries: [] })

    renderPanel()
    await screen.findByText("Todavía no hay entradas en el registro.")

    await userEvent.click(screen.getByRole("combobox", { name: "Nivel" }))
    await userEvent.click(
      await screen.findByRole("option", { name: "Avisos o más" }),
    )

    await waitFor(() =>
      expect(mocks.getRecentLogs).toHaveBeenCalledWith({
        limit: 300,
        level: "warn",
      }),
    )
  })

  it("copies the visible entries to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    mocks.getRecentLogs.mockResolvedValue({ entries })

    renderPanel()
    await screen.findByText("request completed")
    await userEvent.click(screen.getByRole("button", { name: /Copiar/ }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const text = writeText.mock.calls[0][0] as string
    expect(text).toContain("request completed")
    expect(text).toContain('"conversationId":"conv-1"')
  })

  it("shows an error when the logs cannot be read", async () => {
    mocks.getRecentLogs.mockRejectedValue(new Error("nope"))

    renderPanel()

    expect(
      await screen.findByText("No se pudo leer el registro."),
    ).toBeInTheDocument()
  })
})
