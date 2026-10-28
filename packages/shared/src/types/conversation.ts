import type { ProviderStatus } from "./provider"
import type { ImageDimensions } from "./image"

export type MemoryProposalMode = "auto" | "manual"

export type MemoryDecayMode = "silent" | "manual" | "off"

export type TitleSource = "auto" | "manual"

export type BackgroundFit = "cover" | "contain"

export type MessageStyle = "bubble" | "document" | "novel"

export interface ConversationSummary {
  id: string
  characterId: string
  characterName: string
  profileImageAssetId: string | null
  title: string | null
  messageCount: number
  lastActivityAt: string
  createdAt: string
  updatedAt: string
}

export interface ConversationDetail {
  id: string
  characterId: string
  characterName: string
  profileImageAssetId: string | null
  title: string | null
  titleSource: TitleSource | null
  model: string | null
  provider: string | null
  providerInstanceId: string | null
  recentMessageCount: number
  summaryFrequency: number
  /** Model context window in tokens; null when unknown. */
  contextWindow: number | null
  /** Percentage of the window that triggers automatic compaction. */
  compactionThreshold: number
  temperature: number | null
  maxTokens: number | null
  topP: number | null
  frequencyPenalty: number | null
  presencePenalty: number | null
  stopSequences: string[]
  memoryProposalMode: MemoryProposalMode
  customProfileImageAssetId: string | null
  backgroundImageAssetId: string | null
  backgroundImageDimensions?: ImageDimensions | null
  backgroundFit: BackgroundFit
  backgroundScrim: number
  messageStyle: MessageStyle
  characterDialogueColor: string | null
  userDialogueColor: string | null
  playerCharacterId: string | null
  memoryDecayMode: MemoryDecayMode
  memoryDecayThreshold: number
  memoryDecayAgeThreshold: number
  memoryDecaySpeed: number
  createdAt: string
  updatedAt: string
  messages: MessageDTO[]
  messagesHasMore: boolean
  messagesNextCursor: number | null
}

export interface ConversationMessagePage {
  messages: MessageDTO[]
  hasMore: boolean
  nextCursor: number | null
}

export const DEFAULT_MESSAGE_PAGE_SIZE = 50
export const MAX_MESSAGE_PAGE_SIZE = 200

export interface RewindConversationResult {
  deletedMessageIds: string[]
}

export interface ConversationSettingsUpdate {
  model?: string | null
  provider?: string | null
  providerInstanceId?: string | null
  recentMessageCount?: number
  summaryFrequency?: number
  contextWindow?: number | null
  compactionThreshold?: number
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
  memoryProposalMode?: MemoryProposalMode
  customProfileImageAssetId?: string | null
  backgroundImageAssetId?: string | null
  backgroundFit?: BackgroundFit
  backgroundScrim?: number
  messageStyle?: MessageStyle
  characterDialogueColor?: string | null
  userDialogueColor?: string | null
  playerCharacterId?: string | null
  memoryDecayMode?: MemoryDecayMode
  memoryDecayThreshold?: number
  memoryDecayAgeThreshold?: number
  memoryDecaySpeed?: number
  force?: boolean
}

export interface MessageDTO {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  position: number
  alternatives: string[]
  alternativesCursor: number
  createdAt: string
  editedAt: string | null
}

export interface CreateConversationInput {
  characterId: string
  versionId?: string
}

export interface CreateConversationResult {
  conversation: ConversationDetail
  defaultProviderStatus: ProviderStatus
  defaultProviderMessage?: string
}

