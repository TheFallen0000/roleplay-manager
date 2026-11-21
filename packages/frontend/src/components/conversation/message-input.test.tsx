import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/hooks/i18n-provider"

import { MessageInput } from "./message-input"

const renderInput = (onSend = vi.fn()) =>
  render(
    <I18nProvider initialLocale="en">
      <MessageInput
        conversationId="conv-1"
        disabled={false}
        contextWindow={8_192}
        onSend={onSend}
      />
    </I18nProvider>
  )

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("MessageInput", () => {
  it("exposes an accessible name for the message field", () => {
    renderInput()

    expect(
      screen.getByRole("textbox", { name: "Write a message…" })
    ).toBeTruthy()
  })

  it("submits on Enter", () => {
    const onSend = vi.fn()
    renderInput(onSend)
    const input = screen.getByRole("textbox", { name: "Write a message…" })

    fireEvent.change(input, { target: { value: "Hello" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onSend).toHaveBeenCalledWith("Hello")
  })

  it("does not submit while an IME composition is active", () => {
    const onSend = vi.fn()
    renderInput(onSend)
    const input = screen.getByRole("textbox", { name: "Write a message…" })

    fireEvent.change(input, { target: { value: "こんにちは" } })
    fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 })

    expect(onSend).not.toHaveBeenCalled()
  })

  it("does not submit on the Safari IME keyCode fallback", () => {
    const onSend = vi.fn()
    renderInput(onSend)
    const input = screen.getByRole("textbox", { name: "Write a message…" })

    fireEvent.change(input, { target: { value: "こんにちは" } })
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 })

    expect(onSend).not.toHaveBeenCalled()
  })

  it("keeps Shift+Enter as a newline", () => {
    const onSend = vi.fn()
    renderInput(onSend)
    const input = screen.getByRole("textbox", { name: "Write a message…" })

    fireEvent.change(input, { target: { value: "Hello" } })
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true })

    expect(onSend).not.toHaveBeenCalled()
  })
})
