import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

import { CreateDialog } from "./create-dialog"

afterEach(() => {
  cleanup()
})

const renderDialog = (onOpenChange = vi.fn()) =>
  render(
    <I18nProvider initialLocale="es">
      <CreateDialog open locale="es" onOpenChange={onOpenChange} />
    </I18nProvider>,
  )

describe("CreateDialog — two plates, no tabs", () => {
  it("shows a Character plate and a Lorebook plate as links", () => {
    renderDialog()

    const character = screen.getByRole("link", { name: /Personaje/i })
    const lorebook = screen.getByRole("link", { name: /Lorebook/i })

    expect(character).toHaveAttribute("href", "/characters/new")
    expect(lorebook).toHaveAttribute("href", "/lorebooks/new")
    expect(screen.queryByRole("tab")).toBeNull()
  })

  it("keeps the card import as a tertiary action", () => {
    renderDialog()

    expect(
      screen.getByRole("link", { name: /Importar|Import/i }),
    ).toBeInTheDocument()
  })

  it("closes with Escape", async () => {
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

    await userEvent.keyboard("{Escape}")

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
