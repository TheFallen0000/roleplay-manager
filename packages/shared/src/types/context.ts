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

export interface PromptContextDTO {
  systemPrompt: string
  messages: PromptContextMessageDTO[]
  metadata: PromptContextMetadataDTO
}
