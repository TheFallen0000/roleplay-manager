import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useFullscreenFocus } from "./use-fullscreen-focus"

const pressEscape = () =>
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

describe("useFullscreenFocus", () => {
  it("enters and exits with the returned actions", () => {
    const { result } = renderHook(() => useFullscreenFocus())

    expect(result.current.fullscreen).toBe(false)

    act(() => result.current.enter())
    expect(result.current.fullscreen).toBe(true)

    act(() => result.current.exit())
    expect(result.current.fullscreen).toBe(false)
  })

  it("exits with Escape while active", () => {
    const { result } = renderHook(() => useFullscreenFocus())

    act(() => result.current.enter())
    act(() => pressEscape())

    expect(result.current.fullscreen).toBe(false)
  })

  it("ignores other keys and stops listening after exiting", () => {
    const { result } = renderHook(() => useFullscreenFocus())

    act(() => result.current.enter())
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
    })
    expect(result.current.fullscreen).toBe(true)

    act(() => result.current.exit())
    act(() => pressEscape())
    expect(result.current.fullscreen).toBe(false)
  })
})
