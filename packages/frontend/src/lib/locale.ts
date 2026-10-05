import { DEFAULT_LOCALE, isLocale, type Locale } from "@workspace/shared/i18n"

/** Resolves a stored/cookie locale value, falling back to the default. */
export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

let requestLocale: Locale = DEFAULT_LOCALE

/**
 * Locale sent in the `Accept-Language` header of outgoing API requests, so the
 * backend builds the LLM prompt in the same language as the UI. Islands set it
 * on render (see `I18nProvider`).
 */
export function setRequestLocale(locale: Locale): void {
  requestLocale = locale
}

export function getRequestLocale(): Locale {
  return requestLocale
}

/** BCP-47 tag used for `toLocaleDateString`-style formatting. */
export function dateLocale(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US"
}
