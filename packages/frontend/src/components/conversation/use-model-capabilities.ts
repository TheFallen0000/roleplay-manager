import { useCallback, useEffect, useRef, useState } from "react"

import type { ModelCapabilitiesResult } from "@workspace/shared/types/model-capabilities"
import type { ProviderId } from "@workspace/shared/types/provider"

import { getModelCapabilities } from "@/lib/api/providers"

interface UseModelCapabilitiesParams {
  provider: ProviderId | null
  model: string | null
  instanceId?: string | null
  conversationMaxTokens?: number | null
}

interface CapabilitiesSnapshot {
  key: string
  capabilities: ModelCapabilitiesResult | null
  error: unknown
}

interface RequestOptions {
  refresh?: boolean
  conversationOverride?: { maxTokens?: number | null }
}

const buildOptions = (
  refresh: boolean,
  conversationMaxTokens: number | null | undefined
): RequestOptions | undefined => {
  const options: RequestOptions = {}
  if (refresh) options.refresh = true
  if (
    typeof conversationMaxTokens === "number" &&
    Number.isFinite(conversationMaxTokens) &&
    conversationMaxTokens > 0
  ) {
    options.conversationOverride = { maxTokens: conversationMaxTokens }
  }
  return Object.keys(options).length > 0 ? options : undefined
}

/**
 * Resolves the capabilities of the selected model. The conversation only
 * contributes its reply budget: the context window must stay the model's own
 * value so an explicit apply can replace a saved window.
 */
export function useModelCapabilities({
  provider,
  model,
  instanceId,
  conversationMaxTokens,
}: UseModelCapabilitiesParams) {
  const [snapshot, setSnapshot] = useState<CapabilitiesSnapshot | null>(null)
  const requestId = useRef(0)

  const targetKey =
    provider && model
      ? [provider, instanceId ?? "", model, conversationMaxTokens ?? ""].join(
          ":"
        )
      : null

  useEffect(() => {
    if (!targetKey || !provider || !model) return

    const id = ++requestId.current
    const options = buildOptions(false, conversationMaxTokens)
    const request = options
      ? getModelCapabilities(provider, model, instanceId ?? undefined, options)
      : getModelCapabilities(provider, model, instanceId ?? undefined)

    void request
      .then((result) => {
        if (id !== requestId.current) return
        setSnapshot({ key: targetKey, capabilities: result, error: null })
      })
      .catch((nextError: unknown) => {
        if (id !== requestId.current) return
        setSnapshot({ key: targetKey, capabilities: null, error: nextError })
      })

    return () => {
      requestId.current += 1
    }
  }, [targetKey, provider, model, instanceId, conversationMaxTokens])

  const current =
    targetKey !== null && snapshot?.key === targetKey ? snapshot : null
  const loading = targetKey !== null && current === null

  const refresh =
    useCallback(async (): Promise<ModelCapabilitiesResult | null> => {
      if (!provider || !model || !targetKey) return null

      const id = ++requestId.current
      const options = buildOptions(true, conversationMaxTokens) ?? {
        refresh: true,
      }

      try {
        const result = await getModelCapabilities(
          provider,
          model,
          instanceId ?? undefined,
          options
        )
        if (id !== requestId.current) return null
        setSnapshot({ key: targetKey, capabilities: result, error: null })
        return result
      } catch (nextError: unknown) {
        if (id !== requestId.current) return null
        setSnapshot({ key: targetKey, capabilities: null, error: nextError })
        return null
      }
    }, [provider, model, instanceId, conversationMaxTokens, targetKey])

  return {
    capabilities: current?.capabilities ?? null,
    loading,
    error: current?.error ?? null,
    refresh,
  }
}
