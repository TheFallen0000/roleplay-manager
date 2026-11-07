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

import { TagsInput } from "./tags-input"

afterEach(() => {
  cleanup()
})

describe("TagsInput", () => {
  it("renders existing tags as chips", () => {
    render(<TagsInput value={["fantasy", "guardian"]} onChange={() => {}} />)

    expect(screen.getByText("fantasy")).toBeInTheDocument()
    expect(screen.getByText("guardian")).toBeInTheDocument()
  })

  it("adds a tag pressing Enter", () => {
    const onChange = vi.fn()
    render(<TagsInput value={["fantasy"]} onChange={onChange} />)

    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "romance" } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })

    expect(onChange).toHaveBeenCalledWith(["fantasy", "romance"])
  })

  it("shows an empty state when there are no tags", () => {
    render(<TagsInput value={[]} onChange={() => {}} />)

    expect(screen.getByText(/Sin tags/i)).toBeInTheDocument()
  })
})
