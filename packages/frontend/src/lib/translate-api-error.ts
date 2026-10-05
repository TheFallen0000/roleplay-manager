import { ApiClientError } from "./api/client"

/**
 * Translates a backend error using its `code` (e.g. `errors.CHARACTER_NOT_FOUND`)
 * and falls back to the raw backend message, then to the given fallback.
 */
export function translateApiError(
  error: unknown,
  tRaw: (key: string, fallback: string) => string,
  fallback: string,
): string {
  if (error instanceof ApiClientError) {
    return tRaw(`errors.${error.code}`, error.message || fallback)
  }
  return fallback
}
