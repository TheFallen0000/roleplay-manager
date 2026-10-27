export type MemoryDTO = {
  id: string
  conversationId: string
  actor: string
  title: string
  description: string
  priority: number
  createdBy: "user" | "assistant"
  updatedBy: "user" | "assistant" | "system"
  createdAt: string
  updatedAt: string
  /** User messages since the memory was last updated; computed by the API. */
  turnsSinceUpdate?: number
}

export type CreateMemoryInput = {
  actor: string
  title: string
  description: string
  priority?: number
}

export type UpdateMemoryInput = {
  actor?: string
  title?: string
  description?: string
  priority?: number
}

export type DecayMemoriesResultDTO = {
  deleted: number
}
