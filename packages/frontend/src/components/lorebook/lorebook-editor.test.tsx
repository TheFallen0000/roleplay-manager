import { render as rtlRender, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { LorebookEditor } from "./lorebook-editor"

const entry = {
  id: "entry-1",
  name: "Dragon lore",
  sourceId: "1",
  keys: ["dragon"],
  secondaryKeys: [],
  comment: null,
  content: "Dragons breathe fire.",
  constant: false,
  selective: false,
  selectiveLogic: 0 as const,
  insertionOrder: 100,
  position: "after_char" as const,
  rawPosition: "1",
  priority: 0,
  enabled: true,
  caseSensitive: false,
  wholeWords: false,
  order: 0,
  extensions: {},
  unknownFields: null,
}

afterEach(() => {
  cleanup()
})

describe("LorebookEditor", () => {
  it("shows the empty state and the create/import actions", () => {
    render(
      <LorebookEditor
        value={{ name: "", entries: [] }}
        onChange={() => {}}
      />
    )

    expect(screen.getByText(/Sin entradas de lorebook/i)).toBeInTheDocument()
    expect(screen.getByText(/Añadir entrada/i)).toBeInTheDocument()
    expect(screen.getByText(/Importar lorebook/i)).toBeInTheDocument()
  })

  it("renders the current entries with their keys", () => {
    render(
      <LorebookEditor
        value={{ name: "Forest lore", entries: [entry] }}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("Dragon lore")).toBeInTheDocument()
    expect(screen.getByText("dragon")).toBeInTheDocument()
  })

  it("notifies changes when adding an entry", () => {
    const onChange = vi.fn()
    render(
      <LorebookEditor
        value={{ name: "", entries: [] }}
        onChange={onChange}
      />
    )

    screen.getByText(/Añadir entrada/i).click()

    expect(onChange).toHaveBeenCalled()
  })
})
