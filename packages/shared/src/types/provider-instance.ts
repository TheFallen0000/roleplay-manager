export type ProviderKind = "ollama" | "openai-compatible"

export interface ProviderInstance {
  id: string
  kind: ProviderKind
  name: string
  url: string
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProviderInstanceInput {
  kind: ProviderKind
  name: string
  url: string
  apiKey?: string
}

export interface UpdateProviderInstanceInput {
  name?: string
  url?: string
  apiKey?: string
}

export interface ProviderInstanceStatus {
  id: string
  status: "available" | "unavailable" | "unknown"
  message?: string
}
