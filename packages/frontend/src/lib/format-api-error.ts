import { ApiClientError } from "@/lib/api/client"

/**
 * Formats an API error for the UI: `[CODE] message` for `ApiClientError`, the
 * plain message for other errors, and `fallback` otherwise.
 */
export const formatApiError = (error: unknown, fallback = ""): string => {
  if (error instanceof ApiClientError) return `[${error.code}] ${error.message}`
  if (error instanceof Error) return error.message
  return fallback
}
