import { useCallback, useMemo, useState } from "react"
import type * as React from "react"

import {
  translate,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from "@workspace/shared/i18n"

import {
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  TranslationContext,
  type TranslationContextValue,
} from "./use-translation"

interface I18nProviderProps {
  initialLocale: Locale
  children: React.ReactNode
}

export function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      // localStorage unavailable
    }
    try {
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`
    } catch {
      // cookies unavailable
    }
    document.documentElement.lang = next
    // Islands are separate React trees: a reload re-renders every one of them
    // with the new locale (the server reads it from the cookie).
    try {
      window.location.reload()
    } catch {
      // reload unavailable (tests)
    }
  }, [])

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey, params?: TranslationParams) =>
        translate(locale, key, params),
      tRaw: (key: string, fallback: string) => {
        const translated = translate(locale, key)
        return translated === key ? fallback : translated
      },
    }),
    [locale, setLocale],
  )

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}
