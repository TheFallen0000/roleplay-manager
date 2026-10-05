import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type * as React from "react"

import { I18nProvider } from "./i18n-provider"
import { LANGUAGE_STORAGE_KEY, useTranslation } from "./use-translation"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider initialLocale="en">{children}</I18nProvider>
)

const renderTranslation = () => renderHook(() => useTranslation(), { wrapper })

beforeEach(() => {
  localStorage.clear()
  document.documentElement.lang = ""
  document.cookie = "language=; path=/; max-age=0"
  vi.stubGlobal("location", { href: "http://localhost/", reload: vi.fn() })
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe("I18nProvider", () => {
  it("arranca con el locale inicial", () => {
    const { result } = renderTranslation()

    expect(result.current.locale).toBe("en")
    expect(result.current.t("common.save")).toBe("Save")
  })

  it("cambia de idioma, persiste, actualiza el documento y recarga", () => {
    const { result } = renderTranslation()

    act(() => result.current.setLocale("es"))

    expect(result.current.locale).toBe("es")
    expect(result.current.t("common.save")).toBe("Guardar")
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("es")
    expect(document.cookie).toContain("language=es")
    expect(document.documentElement.lang).toBe("es")
    expect(window.location.reload).toHaveBeenCalled()
  })

  it("tRaw traduce claves dinámicas y cae al fallback", () => {
    const { result } = renderTranslation()

    expect(
      result.current.tRaw("errors.CHARACTER_NOT_FOUND", "fallback"),
    ).toBe("The character no longer exists.")
    expect(result.current.tRaw("errors.UNKNOWN", "fallback")).toBe("fallback")
  })
})
