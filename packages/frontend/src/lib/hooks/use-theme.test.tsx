import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type * as React from "react"

import {
  MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  useTheme,
} from "./use-theme"
import { ThemeProvider } from "./theme-provider"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

const renderTheme = () => renderHook(() => useTheme(), { wrapper })

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function resetDocument() {
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.classList.remove("dark")
}

function resetThemeMetas() {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.remove())
}

beforeEach(() => {
  localStorage.clear()
  resetDocument()
  resetThemeMetas()
  mockMatchMedia(false)
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  resetDocument()
  resetThemeMetas()
})

describe("ThemeProvider", () => {
  it("arranca con los valores por defecto", () => {
    const { result } = renderTheme()

    expect(result.current.theme).toBe("default")
    expect(result.current.mode).toBe("system")
    expect(result.current.resolvedMode).toBe("light")
  })

  it("aplica el tema al documento y lo persiste", async () => {
    const { result } = renderTheme()

    act(() => result.current.setTheme("forest"))

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("forest"),
    )
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("forest")
  })

  it("aplica el modo oscuro al documento y lo persiste", async () => {
    const { result } = renderTheme()

    act(() => result.current.setMode("dark"))

    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    )
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("dark")
  })

  it("sincroniza todas las variantes de theme-color con el modo resuelto", async () => {
    const light = document.createElement("meta")
    light.setAttribute("name", "theme-color")
    light.setAttribute("content", "#fbfafd")
    light.setAttribute("media", "(prefers-color-scheme: light)")
    const dark = document.createElement("meta")
    dark.setAttribute("name", "theme-color")
    dark.setAttribute("content", "#17131f")
    dark.setAttribute("media", "(prefers-color-scheme: dark)")
    document.head.append(light, dark)

    const { result } = renderTheme()

    act(() => result.current.setMode("dark"))
    await waitFor(() => {
      expect(light.getAttribute("content")).toBe("#17131f")
      expect(dark.getAttribute("content")).toBe("#17131f")
    })

    act(() => result.current.setMode("light"))
    await waitFor(() => {
      expect(light.getAttribute("content")).toBe("#fbfafd")
      expect(dark.getAttribute("content")).toBe("#fbfafd")
    })
  })

  it("sigue la preferencia del sistema en modo sistema", async () => {
    mockMatchMedia(true)
    const { result } = renderTheme()

    await waitFor(() => expect(result.current.resolvedMode).toBe("dark"))
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    )
  })

  it("recupera los valores guardados al montar", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "ocean")
    localStorage.setItem(MODE_STORAGE_KEY, "dark")

    const { result } = renderTheme()

    await waitFor(() => expect(result.current.theme).toBe("ocean"))
    expect(result.current.mode).toBe("dark")
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("ocean"),
    )
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    )
  })

  it("ignora valores guardados inválidos", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "garbage")
    localStorage.setItem(MODE_STORAGE_KEY, "garbage")

    const { result } = renderTheme()

    expect(result.current.theme).toBe("default")
    expect(result.current.mode).toBe("system")
  })
})
