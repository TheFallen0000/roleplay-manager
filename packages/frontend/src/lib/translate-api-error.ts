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

const TUNNEL_SERVE_URL_PATTERN = /https:\/\/login\.tailscale\.com\/\S+/

/**
 * When the backend reports that Tailscale Serve is not enabled on the tailnet,
 * returns the one-time activation URL included in the message.
 */
export function extractTunnelServeUrl(error: unknown): string | null {
  if (
    !(error instanceof ApiClientError) ||
    error.code !== "TUNNEL_SERVE_NOT_ENABLED"
  ) {
    return null
  }
  const match = error.message.match(TUNNEL_SERVE_URL_PATTERN)
  return match ? match[0] : null
}
