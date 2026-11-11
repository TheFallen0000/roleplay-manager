import {
  render as rtlRender,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { AlternateGreetingsInput } from "./alternate-greetings-input"

afterEach(() => {
  cleanup()
})

describe("AlternateGreetingsInput", () => {
  it("renders the current alternate greetings", () => {
    render(
      <AlternateGreetingsInput
        value={["Greetings, traveler.", "Well met."]}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("Greetings, traveler.")).toBeInTheDocument()
    expect(screen.getByText("Well met.")).toBeInTheDocument()
  })

  it("adds an alternate greeting pressing Enter", () => {
    const onChange = vi.fn()
    render(
      <AlternateGreetingsInput value={["Hello"]} onChange={onChange} />
    )

    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "Well met." } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })

    expect(onChange).toHaveBeenCalledWith(["Hello", "Well met."])
  })

  it("shows an empty state", () => {
    render(<AlternateGreetingsInput value={[]} onChange={() => {}} />)

    expect(screen.getByText(/Sin saludos alternativos/i)).toBeInTheDocument()
  })
})
