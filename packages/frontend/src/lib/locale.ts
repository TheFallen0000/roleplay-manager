import { DEFAULT_LOCALE, isLocale, type Locale } from "@workspace/shared/i18n"

/** Resolves a stored/cookie locale value, falling back to the default. */
export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}
