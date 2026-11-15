export interface PromptContextMessageDTO {
  role: "system" | "user" | "assistant"
  content: string
}

export interface PromptContextMetadataDTO {
  characterName: string
  characterVersion: number
  summaryId: string | null
  memoryCount: number
  recentMessageCount: number
  totalContextMessages: number
  totalCharacters: number
  /** Estimated tokens of the system prompt. */
  systemTokens: number
  /** Estimated tokens of the message window (including the pending message). */
  messageTokens: number
  /** systemTokens + messageTokens. */
  inputTokens: number
  /** Tokens reserved for the reply. */
  outputReserve: number
  /** inputTokens + outputReserve. */
  totalTokens: number
  contextWindow: number | null
  contextPercent: number | null
  /** Percentage that triggers automatic compaction on send. */
  compactionThreshold: number
}

export interface ContextManifestSectionDTO {
  id: string
  source: "system" | "history" | "pending"
  tokens: number
  characters: number
  included: boolean
  reason: string
  itemCount?: number
}

export interface ContextManifestDTO {
  version: 1
  model: string | null
  contextWindow: number | null
  outputReserve: number
  estimatedInputTokens: number
  estimatedTotalTokens: number
  compaction: {
    needed: boolean
    applied: boolean
    threshold: number
  }
  summary: {
    id: string | null
    firstMessageId: string | null
    lastMessageId: string | null
    messagesAfter: number
  }
  memories: {
    total: number
    included: number
    excluded: number
  }
  lorebook?: {
    /** Activated entries dropped because the token budget was exceeded. */
    overBudget: number
    /** Linked lorebook version that fed the prompt (S133). */
    versionNumber?: number
    sourceKey?: string
  }
  messages: {
    afterSummary: number
    pending: number
    excluded: number
    total: number
  }
  sections: ContextManifestSectionDTO[]
}

export interface PromptContextDTO {
  systemPrompt: string
  messages: PromptContextMessageDTO[]
  metadata: PromptContextMetadataDTO
  manifest?: ContextManifestDTO
}
