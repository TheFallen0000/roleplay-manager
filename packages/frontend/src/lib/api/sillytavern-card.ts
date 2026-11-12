import type { CharacterSummary } from "@workspace/shared/types/character"
import type {
  CharacterCardEnvelope,
  SillyTavernCardExportInput,
  SillyTavernCardExportSpec,
  SillyTavernCardFormat,
  SillyTavernCardPreview,
} from "@workspace/shared/types/sillytavern-card"

import { ApiClientError, apiRequest, getBaseUrl } from "./client"
import { getRequestLocale } from "../locale"

export interface SillyTavernCardPayloadInput {
  format: SillyTavernCardFormat
  payload: string
}

export interface SillyTavernCardExportResult {
  format: SillyTavernCardFormat
  body: Blob
}

export const previewSillyTavernCard = (
  input: SillyTavernCardPayloadInput,
): Promise<SillyTavernCardPreview> =>
  apiRequest("/api/characters/cards/preview", {
    method: "POST",
    body: JSON.stringify(input),
  })

export const importSillyTavernCard = (
  input: SillyTavernCardPayloadInput,
): Promise<CharacterSummary> =>
  apiRequest("/api/characters/cards/import", {
    method: "POST",
    body: JSON.stringify(input),
  })

export interface GetCharacterCardOptions {
  spec?: SillyTavernCardExportSpec
  versionId?: string
}

export const getCharacterCard = (
  characterId: string,
  options: GetCharacterCardOptions = {},
): Promise<CharacterCardEnvelope> => {
  const params = new URLSearchParams()
  if (options.spec) params.set("spec", options.spec)
  if (options.versionId) params.set("versionId", options.versionId)
  const query = params.size > 0 ? `?${params.toString()}` : ""
  return apiRequest(`/api/characters/${characterId}/card${query}`)
}

export const updateCharacterCard = (
  characterId: string,
  payload: CharacterCardEnvelope,
): Promise<CharacterCardEnvelope> =>
  apiRequest(`/api/characters/${characterId}/card`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

/**
 * The export endpoint answers with JSON or a raw PNG, so it cannot use
 * `apiRequest` (which always parses JSON). Errors are still JSON.
 */
export const exportSillyTavernCard = async (
  id: string,
  input: SillyTavernCardExportInput,
): Promise<SillyTavernCardExportResult> => {
  const response = await fetch(
    `${getBaseUrl()}/api/characters/${id}/cards/export`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, image/png",
        "Accept-Language": getRequestLocale(),
      },
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    let error: { code?: string; message?: string } | undefined
    try {
      const parsed = JSON.parse(text) as {
        error?: { code?: string; message?: string }
      }
      error = parsed.error
    } catch {
      // Non-JSON error bodies fall back to the status text.
    }
    throw new ApiClientError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? response.statusText,
    )
  }

  const body = await response.blob()
  return {
    format: input.format,
    body: new Blob([body], {
      type: input.format === "json" ? "application/json" : "image/png",
    }),
  }
}
