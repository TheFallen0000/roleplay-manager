export type ProviderId = "ollama" | "openai-compatible"

export type ProviderStatus = "available" | "unavailable" | "unconfigured" | "unknown"

export interface ProviderModel {
  id: string
  name?: string
}

export interface ListModelsResult {
  id: ProviderId
  models: ProviderModel[]
  manualEntryRequired: boolean
}

/** Best-effort context window reported by a provider for one model. */
export interface ModelContextResult {
  id: ProviderId
  model: string
  contextWindow: number | null
}

export interface ProviderListEntry {
  id: ProviderId
}

export interface ProviderStatusEntry {
  id: ProviderId
  status: ProviderStatus
  message?: string
}

export interface DefaultProviderConfig {
  provider: ProviderId | null
  providerInstanceId: string | null
  models: Partial<Record<ProviderId, string>>
}

export interface OpenAICompatibleConfig {
  url: string
  hasApiKey: boolean
}

export interface ConfigureDefaultProviderInput {
  provider: ProviderId
  providerInstanceId?: string | null
  force?: boolean
}

export interface SetProviderModelInput {
  model: string
  providerInstanceId?: string
  force?: boolean
}
