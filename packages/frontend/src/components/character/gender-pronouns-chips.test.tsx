import { render as rtlRender, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type * as React from "react"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nProvider initialLocale="es">{ui}</I18nProvider>)

import { GenderPronounsChips } from "./gender-pronouns-chips"

afterEach(() => {
  cleanup()
})

describe("GenderPronounsChips", () => {
  it("shows gender, pronouns and tagline as read-only chips", () => {
    render(
      <GenderPronounsChips
        gender="female"
        pronouns="she/her"
        tagline="The forest's guardian"
      />
    )

    expect(screen.getByText(/female|femenino/i)).toBeInTheDocument()
    expect(screen.getByText("she/her")).toBeInTheDocument()
    expect(screen.getByText("The forest's guardian")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })

  it("omits the chips when the fields are empty", () => {
    render(<GenderPronounsChips gender={null} pronouns={null} tagline={null} />)

    expect(screen.queryByText(/female|femenino/i)).not.toBeInTheDocument()
    expect(screen.queryByText("she/her")).not.toBeInTheDocument()
  })
})
