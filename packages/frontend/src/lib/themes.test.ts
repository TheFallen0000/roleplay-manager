import { describe, it, expect } from "vitest"

import {
  COLOR_MODES,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  isColorMode,
  isThemeId,
  THEMES,
} from "./themes"

describe("themes registry", () => {
  it("incluye el tema por defecto y no repite ids", () => {
    const ids = THEMES.map((theme) => theme.id)
    expect(ids).toContain(DEFAULT_THEME)
    expect(new Set(ids).size).toBe(ids.length)
    for (const theme of THEMES) {
      expect(theme.labelKey.length).toBeGreaterThan(0)
      expect(theme.swatch.length).toBeGreaterThan(0)
    }
  })

  it("incluye el modo por defecto y no repite ids", () => {
    const ids = COLOR_MODES.map((mode) => mode.id)
    expect(ids).toContain(DEFAULT_COLOR_MODE)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("valida ids de tema", () => {
    expect(isThemeId("forest")).toBe(true)
    expect(isThemeId("ocean")).toBe(true)
    expect(isThemeId("sakura")).toBe(true)
    expect(isThemeId("midnight")).toBe(true)
    expect(isThemeId("default")).toBe(true)
    expect(isThemeId("nope")).toBe(false)
    expect(isThemeId(null)).toBe(false)
  })

  it("valida ids de modo", () => {
    expect(isColorMode("light")).toBe(true)
    expect(isColorMode("dark")).toBe(true)
    expect(isColorMode("system")).toBe(true)
    expect(isColorMode("auto")).toBe(false)
    expect(isColorMode(undefined)).toBe(false)
  })
})
