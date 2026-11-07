import type {
  CreateLorebookEntryInput,
  LorebookDTO,
  LorebookEntryDTO,
  LorebookExportFormat,
  LorebookPreview,
  UpdateLorebookEntryInput,
} from "@workspace/shared/types/sillytavern-card"

import { apiRequest } from "./client"

export interface UpdateLorebookInput {
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
}

export interface ImportLorebookInput {
  format: LorebookExportFormat | "json"
  payload: string
  replace?: boolean
}

export interface LorebookPreviewInput {
  format: "json"
  payload: string
}

export type LorebookExportPayload =
  | { spec: "lorebook_v3"; data: Record<string, unknown> }
  | { entries: Record<string, Record<string, unknown>> }

export const getLorebook = (characterId: string): Promise<LorebookDTO> =>
  apiRequest(`/api/characters/${characterId}/lorebook`)

export const updateLorebook = (
  characterId: string,
  input: UpdateLorebookInput,
): Promise<LorebookDTO> =>
  apiRequest(`/api/characters/${characterId}/lorebook`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const createLorebookEntry = (
  characterId: string,
  input: CreateLorebookEntryInput,
): Promise<LorebookEntryDTO> =>
  apiRequest(`/api/characters/${characterId}/lorebook/entries`, {
    method: "POST",
    body: JSON.stringify(input),
  })

export const updateLorebookEntry = (
  characterId: string,
  entryId: string,
  input: UpdateLorebookEntryInput,
): Promise<LorebookEntryDTO> =>
  apiRequest(`/api/characters/${characterId}/lorebook/entries/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const deleteLorebookEntry = (
  characterId: string,
  entryId: string,
): Promise<void> =>
  apiRequest(`/api/characters/${characterId}/lorebook/entries/${entryId}`, {
    method: "DELETE",
  })

export const reorderLorebookEntries = (
  characterId: string,
  entryIds: string[],
): Promise<void> =>
  apiRequest(`/api/characters/${characterId}/lorebook/entries`, {
    method: "PUT",
    body: JSON.stringify({ entryIds }),
  })

export const importLorebook = (
  characterId: string,
  input: ImportLorebookInput,
): Promise<LorebookDTO> =>
  apiRequest(`/api/characters/${characterId}/lorebook/import`, {
    method: "POST",
    body: JSON.stringify(input),
  })

export const exportLorebook = (
  characterId: string,
  format: LorebookExportFormat,
): Promise<LorebookExportPayload> =>
  apiRequest(`/api/characters/${characterId}/lorebook/export`, {
    method: "POST",
    body: JSON.stringify({ format }),
  })

export const previewLorebook = (
  input: LorebookPreviewInput,
): Promise<LorebookPreview> =>
  apiRequest("/api/lorebooks/preview", {
    method: "POST",
    body: JSON.stringify(input),
  })
