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

const mocks = vi.hoisted(() => ({
  previewSillyTavernCard: vi.fn(),
  importSillyTavernCard: vi.fn(),
}))

vi.mock("@/lib/api/sillytavern-card", () => ({
  previewSillyTavernCard: mocks.previewSillyTavernCard,
  importSillyTavernCard: mocks.importSillyTavernCard,
}))

import { SillyTavernImportDialog } from "./sillytavern-import-dialog"

const preview = {
  name: "Lyra",
  description: "A guardian of the forest.",
  tags: ["fantasy", "guardian"],
  creator: "Card Author",
  lorebookEntryCount: 2,
  cardVersion: "v3" as const,
  warnings: ["REGEX_IGNORED" as const, "EMPTY_GREETING" as const],
}

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
])

beforeEach(() => {
  mocks.previewSillyTavernCard.mockReset()
  mocks.importSillyTavernCard.mockReset()
  mocks.previewSillyTavernCard.mockResolvedValue(preview)
  mocks.importSillyTavernCard.mockResolvedValue({
    id: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    versionNumber: 1,
    createdAt: "2026-11-07T12:00:00.000Z",
    updatedAt: "2026-11-07T12:00:00.000Z",
  })
})

afterEach(() => {
  cleanup()
})

const renderDialog = () => {
  const view = render(
    <SillyTavernImportDialog open onOpenChange={vi.fn()} />
  )
  const input = view.baseElement.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement
  return { input }
}

describe("SillyTavernImportDialog", () => {
  it("detects a PNG by magic bytes and previews it", async () => {
    const { input } = renderDialog()
    const file = new File([pngBytes], "personaje.png", { type: "image/png" })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(mocks.previewSillyTavernCard).toHaveBeenCalledWith({
        format: "png",
        payload: expect.any(String),
      })
    )
  })

  it("detects a JSON card by extension and previews it", async () => {
    const { input } = renderDialog()
    const file = new File(['{"spec":"chara_card_v2","data":{}}'], "card.json", {
      type: "application/json",
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(mocks.previewSillyTavernCard).toHaveBeenCalledWith({
        format: "json",
        payload: '{"spec":"chara_card_v2","data":{}}',
      })
    )
  })

  it("shows name, tags, creator, lorebook count and warnings", async () => {
    const { input } = renderDialog()
    const file = new File(['{}'], "card.json", { type: "application/json" })

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText("Lyra")).toBeInTheDocument()
    expect(screen.getByText("fantasy")).toBeInTheDocument()
    expect(screen.getByText("guardian")).toBeInTheDocument()
    expect(screen.getByText(/Card Author/)).toBeInTheDocument()
    expect(screen.getByText(/2/)).toBeInTheDocument()
    expect(screen.getByText(/REGEX_IGNORED|regex/i)).toBeInTheDocument()
  })

  it("re-sends the raw payload (not the preview) when importing", async () => {
    const { input } = renderDialog()
    const file = new File(['{"spec":"chara_card_v2","data":{}}'], "card.json", {
      type: "application/json",
    })

    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(await screen.findByRole("button", { name: /Importar/i }))

    await waitFor(() =>
      expect(mocks.importSillyTavernCard).toHaveBeenCalledWith({
        format: "json",
        payload: '{"spec":"chara_card_v2","data":{}}',
      })
    )
    expect(mocks.importSillyTavernCard).not.toHaveBeenCalledWith(preview)
  })
})
