import type {
  CreateLorebookInput,
  LorebookDTO,
  LorebookSummaryDTO,
  LorebookVersionDTO,
  UpdateLorebookInput,
} from "@workspace/shared/types/lorebook"

import { apiRequest } from "./client"

export interface UpdateLorebookResult {
  lorebook: LorebookDTO
  createdNewVersion: boolean
}

export const listLorebooks = (
  options: { limit?: number; offset?: number } = {},
): Promise<LorebookSummaryDTO[]> => {
  const params = new URLSearchParams()
  if (options.limit !== undefined) params.set("limit", String(options.limit))
  if (options.offset !== undefined) params.set("offset", String(options.offset))
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
