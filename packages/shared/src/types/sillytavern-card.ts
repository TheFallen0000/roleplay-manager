/**
 * Types for SillyTavern character cards and lorebooks. They describe the wire
 * shapes only: unknown/verbatim JSON stays `unknown` and is never validated
 * here.
 */

export type SillyTavernCardSpec = "chara_card_v2" | "chara_card_v3"
export type SillyTavernLorebookSpec = "lorebook_v3"
export type SillyTavernCardFormat = "json" | "png"
export type SillyTavernCardExportSpec = "v2" | "v3"
export type LorebookExportFormat = "ccv3" | "st-native"

export interface CharaCardDataV2 {
  name: string
  description: string
  personality?: string
  scenario?: string
  first_mes: string
  mes_example?: string
  alternate_greetings?: string[]
  creator_notes?: string
  tags?: string[]
  creator?: string
  character_version?: string
  system_prompt?: string
  post_history_instructions?: string
  character_book?: Record<string, unknown>
  extensions?: unknown
  [key: string]: unknown
}

export interface CharaCardDataV3 extends CharaCardDataV2 {
  assets?: unknown
  nickname?: string
  group_only_greetings?: string[]
  creator_notes_multilingual?: Record<string, unknown>
  source?: unknown
  creation_date?: number
  modification_date?: number
}

export interface SillyTavernCardEnvelope {
  spec: SillyTavernCardSpec
  spec_version?: string
  data: Record<string, unknown>
}

export type SillyTavernCardWarning =
  | "REGEX_IGNORED"
  | "TIMED_EFFECTS_PRESERVED"
  | "IMAGE_ABSENT"
  | "V1_CARD"
  | "EMPTY_DESCRIPTION"
  | "EMPTY_GREETING"
  | "UNSUPPORTED_FIELDS_PRESERVED"
  | "SCAN_DEPTH_PER_ENTRY_IGNORED"

export interface SillyTavernCardPreview {
  name: string
  description: string
  tags: string[]
  creator: string | null
  lorebookEntryCount: number
  cardVersion: "v1" | "v2" | "v3"
  warnings: SillyTavernCardWarning[]
}

export interface SillyTavernCardExportInput {
  format: SillyTavernCardFormat
  spec: SillyTavernCardExportSpec
}

export interface LorebookDTO {
  id: string
  characterId: string
  name: string | null
  description: string | null
  scanDepth: number
  tokenBudget: number
  recursiveScanning: boolean
  extensions: unknown
  unknownFields: unknown
  entries: LorebookEntryDTO[]
}

export interface LorebookEntryDTO {
  id: string
  name: string | null
  sourceId: string | null
  keys: string[]
  secondaryKeys: string[]
  comment: string | null
  content: string
  constant: boolean
  selective: boolean
  selectiveLogic: 0 | 1 | 2 | 3
  insertionOrder: number
  position: "before_char" | "after_char"
  rawPosition: string | null
  priority: number
  enabled: boolean
  caseSensitive: boolean
  wholeWords: boolean
  order: number
  extensions: unknown
  unknownFields: unknown
}

export interface CreateLorebookEntryInput {
  keys: string[]
  secondaryKeys?: string[]
  content: string
  comment?: string | null
  constant?: boolean
  selective?: boolean
  selectiveLogic?: 0 | 1 | 2 | 3
  insertionOrder?: number
  position?: "before_char" | "after_char"
  priority?: number
  enabled?: boolean
  caseSensitive?: boolean
  wholeWords?: boolean
}

export interface UpdateLorebookEntryInput
  extends Partial<CreateLorebookEntryInput> {
  id?: string
}

export interface LorebookPreview {
  detectedShape: "ccv3" | "st-native"
  entryCount: number
  warnings: SillyTavernCardWarning[]
}

export type SillyTavernCardErrorCode =
  | "INVALID_CARD_NAME"
  | "INVALID_CARD_PNG"
  | "INVALID_CARD_JSON"
  | "INVALID_CARD_FIELD_TOO_LARGE"
  | "LOREBOOK_ALREADY_EXISTS"
  | "LOREBOOK_NOT_FOUND"
