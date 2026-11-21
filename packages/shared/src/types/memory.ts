export const MEMORY_TYPES = ["fact", "episode", "thread"] as const

export type MemoryType = (typeof MEMORY_TYPES)[number]

export const isMemoryType = (value: unknown): value is MemoryType =>
  typeof value === "string" &&
  (MEMORY_TYPES as readonly string[]).includes(value)

export type MemoryDTO = {
  id: string
  conversationId: string
  actor: string
  title: string
  description: string
  priority: number
  type: MemoryType
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
  type?: MemoryType
}

export type UpdateMemoryInput = {
  actor?: string
  title?: string
  description?: string
  priority?: number
  type?: MemoryType
}

export type ApplyMemoryChangesResult = {
  memories: MemoryDTO[]
  created: number
  updated: number
  discarded: number
}

export type DecayMemoriesResultDTO = {
  deleted: number
}
