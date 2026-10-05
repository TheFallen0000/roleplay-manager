import { DEFAULT_LOCALE, isLocale, type Locale } from "@workspace/shared/i18n"

/**
 * Resolves the locale from an `Accept-Language` header (e.g. "es", "es-ES",
 * "en-US,en;q=0.9"). Falls back to the default locale.
 */
export function resolveRequestLocale(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE

  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase()
    if (!tag) continue
    const base = tag.split("-")[0]
    if (isLocale(base)) return base
  }

  return DEFAULT_LOCALE
}
