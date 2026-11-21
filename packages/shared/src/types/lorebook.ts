/**
 * Lorebook containers and immutable versions.
 *
 * `LorebookDTO` and its entry/input shapes still live in
 * `./sillytavern-card` (S132 import paths); they are re-exported here so the
 * versioned lorebook API can be imported from one module without duplicating
 * declarations.
 */

import type {
  CreateLorebookEntryInput,
  LorebookDTO,
  LorebookEntryDTO,
  LorebookExportFormat,
} from "./sillytavern-card"

export type {
  CreateLorebookEntryInput,
  LorebookDTO,
  LorebookEntryDTO,
  UpdateLorebookEntryInput,
} from "./sillytavern-card"

export interface LorebookSummaryDTO {
  id: string
  name: string | null
  description: string | null
  currentVersionNumber: number | null
  entryCount: number
  originId?: string | null
  usageCount?: number
  /** Distinct character versions linked to any version of this book. */
  usageVersionCount?: number
  updatedAt: string
}

export interface LorebookVersionDTO {
  id: string
  lorebookId: string
  versionNumber: number
  name: string | null
  description: string | null
  scanDepth: number
  tokenBudget: number
  recursiveScanning: boolean
  sourceKey: string
  entries: LorebookEntryDTO[]
  createdAt: string
}

export interface LorebookVersionSummary {
  lorebookId: string
  versionId: string
  versionNumber: number
  name: string | null
  entryCount: number
  sourceKey: string
  originId?: string | null
  status: "current" | "outdated" | "deleted"
}

export interface LorebookUsageVersion {
  characterVersionId: string
  characterVersionNumber: number
  isCurrentCharacterVersion: boolean
  lorebookVersionNumber: number
}

export interface LorebookUsageCharacter {
  characterId: string
  characterName: string
  /** Character versions linked to the selected lorebook version. */
  inUse: LorebookUsageVersion[]
  /** Character versions linked to older versions of the same book. */
  history: LorebookUsageVersion[]
}

export interface LorebookUsageDTO {
  characters: LorebookUsageCharacter[]
}

export interface LinkLorebookInput {
  characterId: string
  versionId?: string
}

export interface CreateLorebookInput {
  name: string
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  entries?: CreateLorebookEntryInput[]
}

export interface UpdateLorebookInput {
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  entries?: CreateLorebookEntryInput[]
}

export type ImportLorebookAction =
  | "reuse"
  | "restore"
  | "new-version"
  | "new-book"

export type LorebookImportFormat = "json" | LorebookExportFormat

export interface ImportLorebookPreview {
  matched: boolean
  suggestedAction: ImportLorebookAction
  book?: {
    id: string
    name: string | null
    deleted: boolean
    matchedVersionNumber?: number | null
    usedByCharacters?: number
  }
}

export interface ImportLorebookResult {
  action: ImportLorebookAction
  lorebook: LorebookDTO
  matchedVersionNumber?: number | null
}

export interface ImportLorebookInput {
  format: LorebookImportFormat
  payload: string
  action: ImportLorebookAction
}
