import { render as rtlRender, screen, fireEvent, cleanup } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { CharacterDropOverlay } from "./character-drop-overlay"

afterEach(() => {
  cleanup()
})

describe("CharacterDropOverlay", () => {
  it("no muestra el overlay hasta que se arrastra un archivo", () => {
    render(
      <CharacterDropOverlay onFile={() => {}}>
        <div>Lista</div>
      </CharacterDropOverlay>,
    )

    expect(screen.queryByTestId("character-drop-overlay")).not.toBeInTheDocument()
  })

  it("muestra el overlay al arrastrar archivos y lo oculta al soltar", () => {
    const onFile = vi.fn()
    render(
      <CharacterDropOverlay onFile={onFile}>
        <div>Lista</div>
      </CharacterDropOverlay>,
    )

    const target = screen.getByText("Lista").parentElement!

    fireEvent.dragEnter(target, { dataTransfer: { types: ["Files"] } })
    expect(screen.getByTestId("character-drop-overlay")).toBeInTheDocument()
    expect(screen.getByText(/Suelta el archivo aquí/)).toBeInTheDocument()

    const file = new File(["{}"], "personaje.json", { type: "application/json" })
    fireEvent.drop(target, {
      dataTransfer: { types: ["Files"], files: [file] },
    })

    expect(onFile).toHaveBeenCalledWith(file)
    expect(screen.queryByTestId("character-drop-overlay")).not.toBeInTheDocument()
  })

  it("ignora los arrastres que no son de archivos", () => {
    const onFile = vi.fn()
    render(
      <CharacterDropOverlay onFile={onFile}>
        <div>Lista</div>
      </CharacterDropOverlay>,
    )

    const target = screen.getByText("Lista").parentElement!

    fireEvent.dragEnter(target, { dataTransfer: { types: ["text/plain"] } })
    expect(screen.queryByTestId("character-drop-overlay")).not.toBeInTheDocument()
  })
})
