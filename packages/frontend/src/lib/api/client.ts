import { getRequestLocale } from "../locale"
import type { CharacterAssetVariant } from "@workspace/shared/types/image"

const DEFAULT_BASE_URL = "http://localhost:3001"

export interface ApiError {
  code: string
  message: string
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
  }
}

const getConfiguredBaseUrl = (): string | null => {
  if (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_API_URL) {
    return import.meta.env.PUBLIC_API_URL
  }
  // Server-side runtime override: the packaged app (single process) may listen
  // on any port, and SSR calls must hit the same origin.
  if (
    typeof window === "undefined" &&
    typeof process !== "undefined" &&
    process.env?.PUBLIC_API_URL
  ) {
    return process.env.PUBLIC_API_URL
  }
  return null
}

/**
 * Base URL for `fetch` calls (API requests, uploads, SSE).
 *
 * - In the browser it is empty (same-origin): the Astro middleware proxies
 *   `/api/*` to the backend, so LAN and tunnel access use a single origin.
 * - During SSR it points directly at the backend (an absolute URL is required).
 * - `PUBLIC_API_URL` overrides both (split deployments or direct backend access).
 */
export const getBaseUrl = (): string => {
  const configured = getConfiguredBaseUrl()
  if (configured) return configured
  return typeof window === "undefined" ? DEFAULT_BASE_URL : ""
}

/**
 * Base URL for URLs embedded in HTML (`img src`, links). Always browser-visible:
 * relative in the browser so it resolves against the current origin and goes
 * through the `/api` proxy; `PUBLIC_API_URL` still overrides.
 */
export const getPublicBaseUrl = (): string => getConfiguredBaseUrl() ?? ""

export const getCharacterAssetUrl = (
  characterId: string,
  assetId: string,
  variant?: CharacterAssetVariant,
): string => {
  const url = `${getPublicBaseUrl()}/api/characters/${characterId}/assets/${assetId}`
  return variant ? `${url}?variant=${variant}` : url
}

export const uploadCharacterAsset = async (
  characterId: string,
  file: File,
): Promise<{ assetId: string; characterId: string; mimeType: string; sizeBytes: number }> => {
  const url = `${getBaseUrl()}/api/characters/${characterId}/assets`
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  const text = await response.text()
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : undefined

  if (!response.ok) {
    const err = (data as { error?: ApiError } | undefined)?.error
    throw new ApiClientError(
      response.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? response.statusText,
    )
  }

  return data as { assetId: string; characterId: string; mimeType: string; sizeBytes: number }
}

export const uploadConversationCustomImage = async (
  conversationId: string,
  file: File,
): Promise<{ assetId: string; characterId: string; mimeType: string; sizeBytes: number }> => {
  const url = `${getBaseUrl()}/api/conversations/${conversationId}/customization/profile-image`
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  const text = await response.text()
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : undefined

  if (!response.ok) {
    const err = (data as { error?: ApiError } | undefined)?.error
    throw new ApiClientError(
      response.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? response.statusText,
    )
  }

  return data as { assetId: string; characterId: string; mimeType: string; sizeBytes: number }
}

export const uploadConversationBackground = async (
  conversationId: string,
  file: File,
): Promise<{ assetId: string; characterId: string; mimeType: string; sizeBytes: number }> => {
  const url = `${getBaseUrl()}/api/conversations/${conversationId}/customization/background`
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  const text = await response.text()
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : undefined

  if (!response.ok) {
    const err = (data as { error?: ApiError } | undefined)?.error
    throw new ApiClientError(
      response.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? response.statusText,
    )
  }

  return data as { assetId: string; characterId: string; mimeType: string; sizeBytes: number }
}

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const url = `${getBaseUrl()}${path}`
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": getRequestLocale(),
      ...(init.headers ?? {}),
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : undefined

  if (!response.ok) {
    const err = (data as { error?: ApiError } | undefined)?.error
    throw new ApiClientError(
      response.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? response.statusText,
    )
  }

  return data as T
}
