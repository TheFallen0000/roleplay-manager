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
  LorebookEntryDTO,
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
  currentVersionNumber: number | null
  entryCount: number
  originId?: string | null
  usageCount?: number
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
