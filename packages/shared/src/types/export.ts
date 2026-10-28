import type { CharacterVersionDTO } from "./character"
import type { BackgroundFit, MessageStyle } from "./conversation"
import type { MemoryDTO } from "./memory"
import type { MessageDTO } from "./message"
import type { SummaryDTO } from "./summary"

export const EXPORT_SCHEMA_VERSION = 1
export const EXPORT_KIND = "character-export"

export type ExportSection =
  | "definition"
  | "profileImage"
  | "versions"
  | "conversations"
  | "conversations.messages"
  | "conversations.memories"
  | "conversations.summaries"
  | "conversations.settings"
  | "conversations.images"
  | "standaloneSettings"

export const ALL_EXPORT_SECTIONS: ExportSection[] = [
  "definition",
  "profileImage",
  "versions",
  "conversations",
  "conversations.messages",
  "conversations.memories",
  "conversations.summaries",
  "conversations.settings",
  "conversations.images",
  "standaloneSettings",
]

/**
 * Sections that require a parent section to be present. A future import module
 * can rely on the same tree: e.g. memories cannot exist without conversations,
 * which cannot exist without the character itself.
 */
export const EXPORT_SECTION_PARENTS: Partial<Record<ExportSection, ExportSection>> = {
  "conversations.messages": "conversations",
  "conversations.memories": "conversations",
  "conversations.summaries": "conversations",
  "conversations.settings": "conversations",
  "conversations.images": "conversations",
}

export interface ExportSettings {
  model: string | null
  provider: string | null
  providerInstanceId: string | null
  recentMessageCount: number
  summaryFrequency: number
  contextWindow: number | null
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stopSequences: string[]
  memoryProposalMode: "auto" | "manual"
  memoryDecayMode: "manual" | "silent" | "off"
  memoryDecayThreshold: number
  memoryDecayAgeThreshold: number
  memoryDecaySpeed: number
  messageStyle: MessageStyle
  characterDialogueColor: string | null
  userDialogueColor: string | null
  /** Conversation-scoped image; the binary travels in `conversationImages`. */
  customProfileImageAssetId: string | null
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  model: null,
  provider: null,
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  contextWindow: null,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  memoryDecayMode: "silent",
  memoryDecayThreshold: 3,
  memoryDecayAgeThreshold: 30,
  memoryDecaySpeed: 10,
  messageStyle: "bubble",
  characterDialogueColor: null,
  userDialogueColor: null,
  customProfileImageAssetId: null,
}

export interface ExportConversation {
  id: string
  title: string | null
  versionId: string
  createdAt: string
  updatedAt: string
  /** Conversation-scoped image references (binaries live in `conversationImages`). */
  customProfileImageAssetId?: string | null
  backgroundImageAssetId?: string | null
  backgroundFit?: BackgroundFit
  backgroundScrim?: number
  settings?: ExportSettings
  messages?: MessageDTO[]
  memories?: MemoryDTO[]
  summaries?: SummaryDTO[]
}

/** Binary payload of an exported image (base64 encoded). */
export interface ExportImage {
  assetId: string
  mimeType: string
  base64: string
}

/** A unique conversation-scoped image, exported once even if branches share it. */
export type ExportConversationImage = ExportImage

export interface CharacterExport {
  schemaVersion: number
  kind: string
  exportedAt: string
  character: {
    id: string
    name: string
    createdAt: string
    updatedAt: string
  }
  definition?: CharacterVersionDTO
  profileImage?: {
    assetId: string
    mimeType: string
    base64?: string
  }
  versions?: CharacterVersionDTO[]
  conversations?: ExportConversation[]
  conversationImages?: ExportConversationImage[]
  standaloneSettings?: ExportSettings
  /**
   * Custom chat image of the settings template, so applying it on another
   * installation can recreate the asset (the template only carries its id).
   */
  standaloneSettingsImage?: ExportImage
}

export type SettingsTemplateWarning =
  | "PROVIDER_INSTANCE_NOT_FOUND"
  | "PROVIDER_UNSUPPORTED"
  | "NO_CONVERSATIONS"
  | "CUSTOM_IMAGE_NOT_FOUND"

export interface ApplySettingsTemplateResult {
  /** Conversations that received the template. */
  applied: number
  warnings: SettingsTemplateWarning[]
}

export interface ExportCharacterInput {
  sections: ExportSection[]
  includeProfileImageBase64?: boolean
}

export const PLAYER_CHARACTER_EXPORT_KIND = "player-character-export"
export const PLAYER_CHARACTER_EXPORT_SCHEMA_VERSION = 1

/**
 * Personas are user-level and tiny on purpose: the file is standalone (it does
 * not travel inside a character export) and carries no local ids or dates.
 */
export interface PlayerCharacterExport {
  schemaVersion: number
  kind: string
  exportedAt: string
  playerCharacter: {
    name: string
    description: string
  }
}
