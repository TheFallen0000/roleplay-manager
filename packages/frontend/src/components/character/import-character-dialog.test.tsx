import { render as rtlRender, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { ImportCharacterDialog } from "./import-character-dialog"

afterEach(() => {
  cleanup()
})

const validPayload = {
  schemaVersion: 1,
  kind: "character-export",
  exportedAt: "2026-08-12T10:00:00.000Z",
  character: {
    id: "char-1",
    name: "Lyra",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  definition: {
    id: "ver-1",
    characterId: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    description: "Una guardiana",
    instructions: null,
    greeting: "Hola",
    versionNumber: 1,
    createdAt: "2026-08-01T10:00:00.000Z",
    cards: [],
  },
}

const renderDialog = (
  props: Partial<Parameters<typeof ImportCharacterDialog>[0]> = {},
) => {
  const handlers = {
    onOpenChange: vi.fn(),
    onImport: vi.fn(async () => ({ ok: true })),
  }
  const view = render(
    <ImportCharacterDialog
      open
      onOpenChange={handlers.onOpenChange}
      onImport={handlers.onImport}
      {...props}
    />,
  )
  const input = view.baseElement.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement
  return { ...handlers, input }
}

const jsonFile = (content: string, name = "personaje.json") =>
  new File([content], name, { type: "application/json" })

describe("ImportCharacterDialog", () => {
  it("importa un archivo válido y cierra el diálogo", async () => {
    const { input, onImport, onOpenChange } = renderDialog()

    fireEvent.change(input, {
      target: { files: [jsonFile(JSON.stringify(validPayload))] },
    })

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
    expect(onImport.mock.calls[0][0].character.name).toBe("Lyra")
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("muestra un error inline si el archivo no es compatible", async () => {
    const { input, onImport } = renderDialog()

    fireEvent.change(input, {
      target: { files: [jsonFile(JSON.stringify({ kind: "otra-cosa" }))] },
    })

    expect(
      await screen.findByText(/no es una exportación de personaje/),
    ).toBeInTheDocument()
    expect(onImport).not.toHaveBeenCalled()
  })

  it("muestra el error del backend y no cierra el diálogo", async () => {
    const { input, onOpenChange } = renderDialog({
      onImport: vi.fn(async () => ({ ok: false, error: "Archivo corrupto" })),
    })

    fireEvent.change(input, {
      target: { files: [jsonFile(JSON.stringify(validPayload))] },
    })

    expect(await screen.findByText("Archivo corrupto")).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
