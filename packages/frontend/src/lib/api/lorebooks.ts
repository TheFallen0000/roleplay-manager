import type { CharacterVersionDTO } from "@workspace/shared/types/character"
import type {
  CreateLorebookInput,
  ImportLorebookAction,
  ImportLorebookPreview,
  ImportLorebookResult,
  LinkLorebookInput,
  LorebookDTO,
  LorebookSummaryDTO,
  LorebookUsageDTO,
  LorebookVersionDTO,
  UpdateLorebookInput,
} from "@workspace/shared/types/lorebook"

import { apiRequest } from "./client"

export type LorebookFilter = "all" | "in-use" | "unused"
export type LorebookExportFormat = "ccv3" | "st-native"

export interface UpdateLorebookResult {
  lorebook: LorebookDTO
  createdNewVersion: boolean
}

export interface RestoreLorebookVersionResult {
  lorebook: LorebookDTO
  createdNewVersion: boolean
}

export const listLorebooks = (
  options: {
    limit?: number
    offset?: number
    filter?: LorebookFilter
  } = {},
): Promise<LorebookSummaryDTO[]> => {
  const params = new URLSearchParams()
  if (options.limit !== undefined) params.set("limit", String(options.limit))
  if (options.offset !== undefined) params.set("offset", String(options.offset))
  if (options.filter !== undefined) params.set("filter", options.filter)
  const query = params.size > 0 ? `?${params.toString()}` : ""
  return apiRequest(`/api/lorebooks${query}`)
}

export const getLorebook = (id: string): Promise<LorebookDTO> =>
  apiRequest(`/api/lorebooks/${id}`)

export const listLorebookVersions = (
  id: string,
): Promise<LorebookVersionDTO[]> =>
  apiRequest(`/api/lorebooks/${id}/versions`)

export const getLorebookVersion = (
  id: string,
  versionId: string,
): Promise<LorebookVersionDTO> =>
  apiRequest(`/api/lorebooks/${id}/versions/${versionId}`)

export const createLorebook = (
  input: CreateLorebookInput,
): Promise<LorebookDTO> =>
  apiRequest("/api/lorebooks", {
    method: "POST",
    body: JSON.stringify(input),
  })

export const updateLorebook = (
  id: string,
  input: UpdateLorebookInput,
): Promise<UpdateLorebookResult> =>
  apiRequest(`/api/lorebooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const getLorebookUsage = (
  id: string,
  versionId?: string,
): Promise<LorebookUsageDTO> => {
  const params = new URLSearchParams()
  if (versionId) params.set("versionId", versionId)
  const query = params.size > 0 ? `?${params.toString()}` : ""
  return apiRequest(`/api/lorebooks/${id}/usage${query}`)
}

export const linkLorebook = (
  id: string,
  input: LinkLorebookInput,
): Promise<CharacterVersionDTO> =>
  apiRequest(`/api/lorebooks/${id}/link`, {
    method: "POST",
    body: JSON.stringify(input),
  })

export const deleteLorebook = (id: string): Promise<void> =>
  apiRequest(`/api/lorebooks/${id}`, { method: "DELETE" })

export const restoreLorebookVersion = (
  id: string,
  versionId: string,
): Promise<RestoreLorebookVersionResult> =>
  apiRequest(`/api/lorebooks/${id}/versions/${versionId}/restore`, {
    method: "POST",
  })

export const importLorebookPreview = (input: {
  format: LorebookExportFormat
  payload: string
}): Promise<ImportLorebookPreview> =>
  apiRequest("/api/lorebooks/import/preview", {
    method: "POST",
    body: JSON.stringify(input),
  })

export const importLorebook = (input: {
  format: LorebookExportFormat
  payload: string
  action: ImportLorebookAction
}): Promise<ImportLorebookResult> =>
  apiRequest("/api/lorebooks/import", {
    method: "POST",
    body: JSON.stringify(input),
  })

export const exportLorebook = (
  id: string,
  format: LorebookExportFormat,
  versionId?: string,
): Promise<unknown> =>
  apiRequest(`/api/lorebooks/${id}/export`, {
    method: "POST",
    body: JSON.stringify({ format, ...(versionId ? { versionId } : {}) }),
  })
