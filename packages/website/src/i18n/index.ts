import { en, type TranslationKey } from "./en"
import { es } from "./es"

export type Locale = "en" | "es"

export const translations = { en, es } satisfies Record<
  Locale,
  Record<TranslationKey, string>
>

export const otherLocale = (locale: Locale): Locale =>
  locale === "es" ? "en" : "es"

export const localePath = (locale: Locale, path: string): string => {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return locale === "es"
    ? `/es${normalized === "/" ? "/" : normalized}`
    : normalized
}

export const t = (locale: Locale, key: TranslationKey): string =>
  translations[locale][key]

export type { TranslationKey }
