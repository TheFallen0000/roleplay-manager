import { useCallback, useEffect, useMemo, useState } from "react"
import type * as React from "react"

import {
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  type ColorMode,
  type ThemeId,
} from "../themes"
import {
  MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  ThemeContext,
  readStoredMode,
  readStoredTheme,
  systemPrefersDark,
  type ResolvedColorMode,
  type ThemeContextValue,
} from "./use-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers read localStorage / matchMedia only on the client; on the
  // server they fall back to the defaults, so hydration stays consistent.
  const [theme, setThemeState] = useState<ThemeId>(() =>
    typeof document === "undefined" ? DEFAULT_THEME : readStoredTheme(),
  )
  const [mode, setModeState] = useState<ColorMode>(() =>
    typeof document === "undefined" ? DEFAULT_COLOR_MODE : readStoredMode(),
  )
  const [systemDark, setSystemDark] = useState(() =>
    typeof window === "undefined" ? false : systemPrefersDark(),
  )

  // Follow the OS preference while the mode is "system".
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches)
    query.addEventListener("change", handleChange)
    return () => query.removeEventListener("change", handleChange)
  }, [])

  const resolvedMode: ResolvedColorMode =
    mode === "system" ? (systemDark ? "dark" : "light") : mode

  // Apply to <html>. Idempotent with the anti-flash script in base.astro.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle("dark", resolvedMode === "dark")
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolvedMode === "dark" ? "#17131f" : "#fbfafd")
  }, [theme, resolvedMode])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolvedMode, setTheme, setMode }),
    [theme, mode, resolvedMode, setTheme, setMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
