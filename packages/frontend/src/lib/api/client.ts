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

export const getBaseUrl = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_API_URL) {
    return import.meta.env.PUBLIC_API_URL
  }
  return DEFAULT_BASE_URL
}

export const getCharacterAssetUrl = (
  characterId: string,
  assetId: string,
  variant?: CharacterAssetVariant,
): string => {
  const url = `${getBaseUrl()}/api/characters/${characterId}/assets/${assetId}`
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
