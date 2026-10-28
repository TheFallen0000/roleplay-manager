import type {
  CharacterDetail,
  CharacterListPage,
  CharacterSummary,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@workspace/shared/types/character"
import type {
  CharacterExport,
  ExportImage,
  ExportSection,
  ExportSettings,
  ApplySettingsTemplateResult,
} from "@workspace/shared/types/export"
import {
  EXPORT_KIND,
  EXPORT_SCHEMA_VERSION,
} from "@workspace/shared/types/export"

import { apiRequest } from "./client"

export const listCharacters = (): Promise<CharacterSummary[]> =>
  apiRequest("/api/characters")

export const listCharactersPage = (
  options: { limit?: number; offset?: number } = {},
): Promise<CharacterListPage> => {
  const params = new URLSearchParams()
  if (options.limit !== undefined) params.set("limit", String(options.limit))
  if (options.offset !== undefined) params.set("offset", String(options.offset))
  const query = params.size > 0 ? `?${params.toString()}` : ""
  return apiRequest(`/api/characters${query}`)
}

export const getCharacter = (id: string): Promise<CharacterDetail> =>
  apiRequest(`/api/characters/${id}`)

export const createCharacter = (input: CreateCharacterInput): Promise<CharacterDetail> =>
  apiRequest("/api/characters", {
    method: "POST",
    body: JSON.stringify(input),
  })

export const updateCharacter = (
  id: string,
  input: UpdateCharacterInput,
): Promise<CharacterDetail> =>
  apiRequest(`/api/characters/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const updateCharacterProfileImage = (
  id: string,
  profileImageAssetId: string | null,
): Promise<CharacterDetail> =>
  apiRequest(`/api/characters/${id}/profile-image`, {
    method: "PATCH",
    body: JSON.stringify({ profileImageAssetId }),
  })

export const deleteCharacter = (id: string): Promise<void> =>
  apiRequest(`/api/characters/${id}`, { method: "DELETE" })

export const listCharacterVersions = (id: string): Promise<CharacterDetail["versions"]> =>
  apiRequest(`/api/characters/${id}/versions`)

export const exportCharacter = (
  id: string,
  sections: ExportSection[],
  includeProfileImageBase64 = true,
): Promise<CharacterExport> =>
  apiRequest(`/api/characters/${id}/exports`, {
    method: "POST",
    body: JSON.stringify({ sections, includeProfileImageBase64 }),
  })

export const importCharacter = (payload: CharacterExport): Promise<CharacterSummary> =>
  apiRequest("/api/characters/imports", {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const applySettingsTemplate = (
  id: string,
  settings: Partial<ExportSettings>,
  image?: ExportImage,
): Promise<ApplySettingsTemplateResult> =>
  apiRequest(`/api/characters/${id}/settings-imports`, {
    method: "POST",
    body: JSON.stringify({
      kind: EXPORT_KIND,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      standaloneSettings: settings,
      ...(image ? { standaloneSettingsImage: image } : {}),
    }),
  })
