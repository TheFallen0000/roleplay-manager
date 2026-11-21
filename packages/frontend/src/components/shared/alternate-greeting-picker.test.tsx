import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

import { AlternateGreetingPicker } from "./alternate-greeting-picker"

const renderPicker = (
  props: Partial<Parameters<typeof AlternateGreetingPicker>[0]> = {},
) => {
  const onConfirm = vi.fn()
  const view = render(
    <I18nProvider initialLocale="es">
      <AlternateGreetingPicker
        open
        greeting="Hola, viajero."
        alternateGreetings={["Buenas noches.", "Te estaba esperando."]}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
        {...props}
      />
    </I18nProvider>,
  )
  return { ...view, onConfirm }
}

afterEach(() => {
  cleanup()
})

describe("AlternateGreetingPicker", () => {
  it("is not shown when the version has no alternate greetings", () => {
    renderPicker({ alternateGreetings: [] })

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("lists first_mes and every alternate greeting with its preview", async () => {
    renderPicker()

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/Hola, viajero\./)).toBeInTheDocument()
    expect(screen.getByText(/Buenas noches\./)).toBeInTheDocument()
    expect(screen.getByText(/Te estaba esperando\./)).toBeInTheDocument()
    expect(screen.getAllByText(/Saludo inicial|first_mes/i).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Alternativa|alternativo/i).length,
    ).toBeGreaterThan(0)
  })

  it("confirms the selected alternate greeting by index", async () => {
    const { onConfirm } = renderPicker()

    await screen.findByRole("dialog")
    await userEvent.click(screen.getByText(/Buenas noches\./))
    await userEvent.click(
      screen.getByRole("button", {
        name: /Conversar|Iniciar|Confirmar|Continuar|Aceptar/i,
      }),
    )

    expect(onConfirm).toHaveBeenCalledWith(1)
  })

  it("confirms first_mes with index 0", async () => {
    const { onConfirm } = renderPicker()

    await screen.findByRole("dialog")
    await userEvent.click(screen.getByText(/Hola, viajero\./))
    await userEvent.click(
      screen.getByRole("button", {
        name: /Conversar|Iniciar|Confirmar|Continuar|Aceptar/i,
      }),
    )

    expect(onConfirm).toHaveBeenCalledWith(0)
  })
})
