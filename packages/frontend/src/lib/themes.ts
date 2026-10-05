export type ThemeId = "default" | "forest" | "ocean"

export type ColorMode = "light" | "dark" | "system"

export const DEFAULT_THEME: ThemeId = "default"
export const DEFAULT_COLOR_MODE: ColorMode = "system"

export interface ThemeDefinition {
  id: ThemeId
  labelKey: "theme.default" | "theme.forest" | "theme.ocean"
  /** Preview color for the theme picker (the theme's primary token). */
  swatch: string
}

export const THEMES: ThemeDefinition[] = [
  { id: "default", labelKey: "theme.default", swatch: "oklch(0.205 0 0)" },
  { id: "forest", labelKey: "theme.forest", swatch: "oklch(0.47 0.12 150)" },
  { id: "ocean", labelKey: "theme.ocean", swatch: "oklch(0.48 0.14 250)" },
]

export interface ColorModeDefinition {
  id: ColorMode
  labelKey: "theme.light" | "theme.dark" | "theme.system"
}

export const COLOR_MODES: ColorModeDefinition[] = [
  { id: "light", labelKey: "theme.light" },
  { id: "dark", labelKey: "theme.dark" },
  { id: "system", labelKey: "theme.system" },
]

const THEME_IDS: string[] = THEMES.map((theme) => theme.id)
const COLOR_MODE_IDS: string[] = COLOR_MODES.map((mode) => mode.id)

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value)
}

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === "string" && COLOR_MODE_IDS.includes(value)
}
