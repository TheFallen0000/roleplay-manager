import { describe, it, expect, vi, afterEach } from "vitest"
import { render as rtlRender, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { InstanceFormDialog } from "./instance-form-dialog"

afterEach(() => {
  cleanup()
  // Clean up stray portal elements Base UI leaves behind
  document.body.querySelectorAll("[data-base-ui-portal]").forEach(el => el.remove())
  document.body.querySelectorAll("[data-base-ui-inert]").forEach(el => el.remove())
  document.body.style.overflowY = ""
  document.body.style.overflowX = ""
})

describe("InstanceFormDialog", () => {
  it("onSave receives typed values - direct open with open=true", async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <InstanceFormDialog
        open={true}
        mode="create"
        initialName=""
        initialUrl=""
        initialApiKey=""
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const nameInput = screen.getByLabelText("Nombre")
    const urlInput = screen.getByLabelText("URL base")

    await user.type(nameInput, "Mi Instancia")
    await user.type(urlInput, "http://localhost:1234/v1")

    await user.click(screen.getByText("Crear instancia"))

    console.log("[diagnostic] onSave called with:", JSON.stringify(onSave.mock.calls[0]))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      "Mi Instancia",
      "http://localhost:1234/v1",
      expect.any(String),
    )
  })

  it("typing in input actually updates the controlled value", async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <InstanceFormDialog
        open={true}
        mode="create"
        initialName=""
        initialUrl=""
        initialApiKey=""
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const nameInput = screen.getByLabelText("Nombre") as HTMLInputElement

    await user.type(nameInput, "Ollama")

    // Check the DOM value
    expect(nameInput).toHaveValue("Ollama")

    // Save and check what onSave received
    await user.click(screen.getByText("Crear instancia"))

    console.log("[diagnostic-value-check] DOM value:", nameInput.value)
    console.log("[diagnostic-value-check] onSave called with:", JSON.stringify(onSave.mock.calls[0]))

    expect(onSave).toHaveBeenCalledWith(
      "Ollama",
      expect.any(String),
      expect.any(String),
    )
  })

  it("two sequential clicks send same values", async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <InstanceFormDialog
        open={true}
        mode="create"
        initialName=""
        initialUrl=""
        initialApiKey=""
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const nameInput = screen.getByLabelText("Nombre") as HTMLInputElement

    await user.type(nameInput, "Ollama")

    // First click
    await user.click(screen.getByText("Crear instancia"))
    console.log("[diagnostic-2click-1st] DOM value:", nameInput.value)
    console.log("[diagnostic-2click-1st] onSave:", JSON.stringify(onSave.mock.calls[0]))

    // Second click
    await user.click(screen.getByText("Crear instancia"))
    console.log("[diagnostic-2click-2nd] DOM value:", nameInput.value)
    console.log("[diagnostic-2click-2nd] onSave:", JSON.stringify(onSave.mock.calls[1]))

    expect(onSave).toHaveBeenCalledTimes(2)
    expect(onSave.mock.calls[0]).toEqual(["Ollama", expect.any(String), expect.any(String)])
    expect(onSave.mock.calls[1]).toEqual(["Ollama", expect.any(String), expect.any(String)])
  })
})
