import { createContext, useContext } from "react"

import type {
  Locale,
  TranslationKey,
  TranslationParams,
} from "@workspace/shared/i18n"

export const LANGUAGE_STORAGE_KEY = "language"
export const LANGUAGE_COOKIE_NAME = "language"

export interface TranslationContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
  /** Translation for a dynamic key (e.g. an error code) with a fallback. */
  tRaw: (key: string, fallback: string) => string
}

export const TranslationContext = createContext<TranslationContextValue | null>(
  null,
)

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider")
  }
  return context
}
