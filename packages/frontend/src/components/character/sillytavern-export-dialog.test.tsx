import {
  render as rtlRender,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import type { CharacterSummary } from "@workspace/shared/types/character"

const mocks = vi.hoisted(() => ({
  exportSillyTavernCard: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@/lib/api/sillytavern-card", () => ({
  exportSillyTavernCard: mocks.exportSillyTavernCard,
}))

vi.mock("@workspace/ui/components/sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

import { SillyTavernExportDialog } from "./sillytavern-export-dialog"

const character: CharacterSummary = {
  id: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
}

beforeEach(() => {
  mocks.exportSillyTavernCard.mockReset()
  mocks.toastSuccess.mockReset()
  mocks.toastError.mockReset()
  mocks.exportSillyTavernCard.mockResolvedValue({
    format: "png",
    body: new Blob([new Uint8Array([0x89, 0x50])], { type: "image/png" }),
  })
  URL.createObjectURL = vi.fn(() => "blob:mock-export")
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const renderDialog = () =>
  render(
    <SillyTavernExportDialog
      character={character}
      open
      onOpenChange={vi.fn()}
    />
  )

describe("SillyTavernExportDialog", () => {
  it("exports PNG V3 by default", async () => {
    renderDialog()

    fireEvent.click(screen.getByText("PNG"))
    fireEvent.click(screen.getByText("V3"))
    fireEvent.click(screen.getByText("Exportar"))

    await waitFor(() =>
      expect(mocks.exportSillyTavernCard).toHaveBeenCalledWith("char-1", {
        format: "png",
        spec: "v3",
      })
    )
  })

  it("exports JSON V2 when selected", async () => {
    renderDialog()

    fireEvent.click(screen.getByText("JSON"))
    fireEvent.click(screen.getByText("V2"))
    fireEvent.click(screen.getByText("Exportar"))

    await waitFor(() =>
      expect(mocks.exportSillyTavernCard).toHaveBeenCalledWith("char-1", {
        format: "json",
        spec: "v2",
      })
    )
  })

  it("shows a toast and keeps the dialog open on failure", async () => {
    mocks.exportSillyTavernCard.mockRejectedValueOnce(new Error("boom"))
    renderDialog()

    fireEvent.click(screen.getByText("Exportar"))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled())
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })
})
