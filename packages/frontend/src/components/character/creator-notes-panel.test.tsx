import { render as rtlRender, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { CreatorNotesPanel } from "./creator-notes-panel"

afterEach(() => {
  cleanup()
})

describe("CreatorNotesPanel", () => {
  it("shows the creator notes as plain text", () => {
    render(
      <CreatorNotesPanel notes="Notas del creador con <b>HTML</b> literal." />
    )

    expect(screen.getByText(/Notas del creador con/)).toBeInTheDocument()
    expect(screen.queryByRole("strong")).not.toBeInTheDocument()
  })

  it("warns that creator notes are never sent to the model", () => {
    render(<CreatorNotesPanel notes="Notas" />)

    expect(screen.getByText(/nunca se envía al modelo/i)).toBeInTheDocument()
  })

  it("shows an empty state when there are no notes", () => {
    render(<CreatorNotesPanel notes={null} />)

    expect(screen.getByText(/Sin notas/i)).toBeInTheDocument()
  })
})
