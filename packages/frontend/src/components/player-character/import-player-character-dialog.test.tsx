import { render as rtlRender, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { ImportPlayerCharacterDialog } from "./import-player-character-dialog"

afterEach(() => {
  cleanup()
})

const validPayload = {
  schemaVersion: 1,
  kind: "player-character-export",
  exportedAt: "2026-10-13T12:00:00.000Z",
  playerCharacter: {
    name: "Alice",
    description: "Una exploradora curiosa.",
  },
}

const renderDialog = (
  props: Partial<Parameters<typeof ImportPlayerCharacterDialog>[0]> = {},
) => {
  const handlers = {
    onOpenChange: vi.fn(),
    onImport: vi.fn(async () => ({ ok: true })),
  }
  const view = render(
    <ImportPlayerCharacterDialog
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

const jsonFile = (content: string, name = "persona.json") =>
  new File([content], name, { type: "application/json" })

describe("ImportPlayerCharacterDialog", () => {
  it("importa un archivo válido y cierra el diálogo", async () => {
    const { input, onImport, onOpenChange } = renderDialog()

    fireEvent.change(input, {
      target: { files: [jsonFile(JSON.stringify(validPayload))] },
    })

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
    expect(onImport.mock.calls[0][0].playerCharacter.name).toBe("Alice")
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("muestra un error inline si el archivo no es compatible", async () => {
    const { input, onImport } = renderDialog()

    fireEvent.change(input, {
      target: { files: [jsonFile(JSON.stringify({ kind: "otra-cosa" }))] },
    })

    expect(
      await screen.findByText(/no es una exportación de persona compatible/),
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
