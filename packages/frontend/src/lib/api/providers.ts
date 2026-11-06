import type { ModelCapabilitiesResult } from "@workspace/shared/types/model-capabilities"
import type {
  ListModelsResult,
  ModelContextResult,
  ProviderId,
  ProviderStatusEntry,
} from "@workspace/shared/types/provider"

import { apiRequest } from "./client"

export const listProviders = async (): Promise<{ id: ProviderId }[]> => {
  return apiRequest("/api/providers")
}

export const validateProvider = async (
  id: ProviderId,
): Promise<ProviderStatusEntry> => {
  return apiRequest(`/api/providers/${id}/status`)
}

export const listProviderModels = async (
  id: ProviderId,
  instanceId?: string,
): Promise<ListModelsResult> => {
  const params = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : ""
  return apiRequest(`/api/providers/${id}/models${params}`)
}

export const getModelContextWindow = async (
  id: ProviderId,
  model: string,
  instanceId?: string,
  options?: { refresh?: boolean },
): Promise<ModelContextResult> => {
  const params = new URLSearchParams({ model })
  if (instanceId) params.set("instanceId", instanceId)
  if (options?.refresh === true) params.set("refresh", "true")
  return apiRequest(`/api/providers/${id}/model-context?${params.toString()}`)
}

export const getModelCapabilities = async (
  id: ProviderId,
  model: string,
  instanceId?: string,
  options?: {
    refresh?: boolean
    conversationOverride?: {
      contextWindow?: number | null
      maxTokens?: number | null
    }
  },
): Promise<ModelCapabilitiesResult> => {
  const params = new URLSearchParams({ model })
  if (instanceId) params.set("instanceId", instanceId)
  if (options?.refresh === true) params.set("refresh", "true")
  const overrideWindow = options?.conversationOverride?.contextWindow
  if (typeof overrideWindow === "number" && overrideWindow > 0) {
    params.set("contextWindow", String(overrideWindow))
  }
  const overrideMaxTokens = options?.conversationOverride?.maxTokens
  if (typeof overrideMaxTokens === "number" && overrideMaxTokens > 0) {
    params.set("maxTokens", String(overrideMaxTokens))
  }
  return apiRequest(`/api/providers/${id}/capabilities?${params.toString()}`)
}
