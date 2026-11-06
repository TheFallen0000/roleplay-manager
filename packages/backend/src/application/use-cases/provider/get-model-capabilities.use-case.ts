import {
  DEFAULT_OUTPUT_RESERVE,
  computeWorkingWindow,
  normalizeModelIdentity,
  resolveModelCapabilities,
} from "@workspace/shared/lib/model-capabilities"
import type {
  CapabilityClaim,
  CapabilityWarningCode,
  CuratedModelEntry,
  ModelCapabilities,
  ModelCapabilitiesResult,
} from "@workspace/shared/types/model-capabilities"
import type { ProviderId } from "@workspace/shared/types/provider"

import { DomainError } from "../../../domain/errors"
import type { Logger } from "../../../domain/ports/logger.port"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import {
  buildCapabilitiesCacheKey,
  type ModelCapabilitiesCache,
} from "../../services/model-capabilities-cache.service"

export type { ModelCapabilitiesResult } from "@workspace/shared/types/model-capabilities"

export interface GetModelCapabilitiesParams {
  id: ProviderId
  model: string
  providerInstanceId?: string
  conversationOverride?: {
    contextWindow?: number | null
    maxTokens?: number | null
  }
  /** Bypasses the cache and re-probes the provider. */
  refresh?: boolean
  /**
   * Legacy `model-context` semantics: only trust the live probe, never a
   * curated/heuristic/default fallback or a stale claim.
   */
  probeOnly?: boolean
}

type CapabilityGuess = {
  contextWindow?: number
  maxOutputTokens?: number
}

export interface GetModelCapabilitiesDeps {
  registry: ProviderRegistry
  providerInstanceRepository: ProviderInstanceRepository
  settings: SettingsRepository
  cache: ModelCapabilitiesCache
  curatedTable: CuratedModelEntry[]
  heuristicForModel?: (normalizedModel: string) => CapabilityGuess | null
  defaults?: CapabilityGuess
  logger: Logger
}

interface CapabilityOverride {
  contextWindow: number | null
  maxOutputTokens: number | null
}

interface ProbeOutcome {
  claims: CapabilityClaim[]
  failed: boolean
}

const APP_OVERRIDE_KEY = "model_capabilities.override.default"
const MODEL_OVERRIDE_PREFIX = "model_capabilities.override.model"

const MAX_REQUESTED_TOKENS = 200_000

const parseOverride = (raw: string | null | undefined): CapabilityOverride | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      contextWindow:
        typeof parsed.contextWindow === "number" ? parsed.contextWindow : null,
      maxOutputTokens:
        typeof parsed.maxOutputTokens === "number"
          ? parsed.maxOutputTokens
          : null,
    }
  } catch {
    return null
  }
}

const overlayOverride = (
  base: CapabilityOverride,
  layer: CapabilityOverride | null,
): CapabilityOverride => {
  if (!layer) return base
  return {
    contextWindow: layer.contextWindow ?? base.contextWindow,
    maxOutputTokens: layer.maxOutputTokens ?? base.maxOutputTokens,
  }
}

const sanitizeClaim = (claim: CapabilityClaim): CapabilityClaim => ({
  source: claim.source,
  confidence: claim.confidence,
  model: claim.model,
  specificity: claim.specificity,
  contextWindow: claim.contextWindow ?? null,
  maxOutputTokens: claim.maxOutputTokens ?? null,
})

const clampRequestedTokens = (value: number): number =>
  Math.min(MAX_REQUESTED_TOKENS, Math.max(1, Math.floor(value)))

/**
 * Resolves the capabilities of one chat model by layering manual overrides,
 * cached/runtime probe claims and the curated catalog. Provider failures never
 * escape: they degrade the resolution to a lower source.
 */
export class GetModelCapabilitiesUseCase {
  constructor(private readonly deps: GetModelCapabilitiesDeps) {}

  async execute({
    id,
    model,
    providerInstanceId,
    conversationOverride,
    refresh,
    probeOnly,
  }: GetModelCapabilitiesParams): Promise<ModelCapabilitiesResult> {
    const identity = normalizeModelIdentity(
      id,
      model,
      providerInstanceId ?? null,
    )
    const adapter = await this.resolveAdapter(id, providerInstanceId)

    const override = probeOnly
      ? null
      : await this.readOverride(
          id,
          identity.normalizedModel,
          providerInstanceId,
          conversationOverride,
        )

    const cacheKey = buildCapabilitiesCacheKey(
      id,
      providerInstanceId ?? null,
      identity.normalizedModel,
    )
    const { claims, warnings } = await this.loadProbeClaims({
      adapter,
      cacheKey,
      id,
      model,
      providerInstanceId,
      refresh: refresh === true,
      probeOnly: probeOnly === true,
    })

    const resolved = resolveModelCapabilities({
      target: { provider: id, model, instanceId: providerInstanceId ?? null },
      claims,
      ...(probeOnly
        ? {}
        : {
            curatedTable: this.deps.curatedTable,
            override: override
              ? {
                  contextWindow: override.contextWindow ?? undefined,
                  maxOutputTokens: override.maxOutputTokens ?? undefined,
                }
              : undefined,
            ...(this.deps.heuristicForModel
              ? {
                  heuristic: this.deps.heuristicForModel(
                    identity.normalizedModel,
                  ),
                }
              : {}),
            ...(this.deps.defaults ? { defaults: this.deps.defaults } : {}),
          }),
    })
    const capabilities: ModelCapabilities = { ...resolved, warnings }

    const requestedMaxTokens =
      typeof conversationOverride?.maxTokens === "number"
        ? clampRequestedTokens(conversationOverride.maxTokens)
        : DEFAULT_OUTPUT_RESERVE
    const workingWindow = computeWorkingWindow({
      contextWindow: capabilities.contextWindow,
      requestedMaxTokens,
      modelMaxOutputTokens: capabilities.maxOutputTokens,
    })

    return { id, model, capabilities, workingWindow }
  }

  private async resolveAdapter(
    id: ProviderId,
    providerInstanceId?: string,
  ): Promise<ProviderPort | null> {
    if (!providerInstanceId) {
      return this.deps.registry.getAdapter(id)
    }
    const instance =
      await this.deps.providerInstanceRepository.findById(providerInstanceId)
    if (!instance) {
      throw new DomainError(
        "PROVIDER_INSTANCE_NOT_FOUND",
        `Provider instance '${providerInstanceId}' not found.`,
      )
    }
    return this.deps.registry.createAdapter(instance)
  }

  private async readOverride(
    id: ProviderId,
    normalizedModel: string,
    providerInstanceId: string | undefined,
    conversationOverride: GetModelCapabilitiesParams["conversationOverride"],
  ): Promise<CapabilityOverride | null> {
    const providerKey = `${MODEL_OVERRIDE_PREFIX}.${id}:${normalizedModel}`
    const instanceKey = providerInstanceId
      ? `${MODEL_OVERRIDE_PREFIX}.${id}:${providerInstanceId}:${normalizedModel}`
      : null

    const keys = [APP_OVERRIDE_KEY, providerKey]
    if (instanceKey) keys.push(instanceKey)

    const stored = await this.deps.settings.getMany(keys)
    let merged: CapabilityOverride = {
      contextWindow: null,
      maxOutputTokens: null,
    }
    merged = overlayOverride(merged, parseOverride(stored[APP_OVERRIDE_KEY]))
    // A provider-wide override applies to every instance; the instance key wins.
    merged = overlayOverride(merged, parseOverride(stored[providerKey]))
    if (instanceKey) {
      merged = overlayOverride(merged, parseOverride(stored[instanceKey]))
    }

    // The conversation only overrides the context window. `maxTokens` is the
    // requested output budget, not the model's own maximum output.
    merged = overlayOverride(merged, {
      contextWindow: conversationOverride?.contextWindow ?? null,
      maxOutputTokens: null,
    })

    return merged.contextWindow === null && merged.maxOutputTokens === null
      ? null
      : merged
  }

  private async loadProbeClaims(params: {
    adapter: ProviderPort | null
    cacheKey: string
    id: ProviderId
    model: string
    providerInstanceId?: string
    refresh: boolean
    probeOnly: boolean
  }): Promise<{ claims: CapabilityClaim[]; warnings: CapabilityWarningCode[] }> {
    const {
      adapter,
      cacheKey,
      id,
      model,
      providerInstanceId,
      refresh,
      probeOnly,
    } = params
    const warnings: CapabilityWarningCode[] = []

    if (!refresh) {
      const cached = this.deps.cache.get(cacheKey)
      if (cached) {
        return { claims: [cached.claim], warnings }
      }
    }

    const outcome = await this.probe(adapter, id, model)
    if (!outcome.failed) {
      if (outcome.claims.length === 0) {
        // A successful probe that knows nothing invalidates an older claim.
        this.deps.cache.invalidate(cacheKey)
        return { claims: [], warnings }
      }
      const claim = sanitizeClaim(outcome.claims[0])
      this.deps.cache.set(cacheKey, claim)
      return { claims: [claim], warnings }
    }

    warnings.push("PROBE_FAILED")
    this.deps.logger.warn("Model capability probe failed", {
      id,
      model,
      providerInstanceId,
    })

    if (probeOnly) {
      return { claims: [], warnings }
    }

    const stale = this.deps.cache.getStale(cacheKey)
    if (stale) {
      warnings.push("STALE_CACHE")
      return { claims: [stale.claim], warnings }
    }

    return { claims: [], warnings }
  }

  private async probe(
    adapter: ProviderPort | null,
    id: ProviderId,
    model: string,
  ): Promise<ProbeOutcome> {
    if (!adapter) return { claims: [], failed: false }
    try {
      if (adapter.resolveCapabilities) {
        return {
          claims: await adapter.resolveCapabilities(model),
          failed: false,
        }
      }
      if (adapter.getModelContextWindow) {
        const contextWindow = await adapter.getModelContextWindow(model)
        if (contextWindow === null) return { claims: [], failed: false }
        return {
          claims: [
            {
              source: "runtime-introspection",
              confidence: "high",
              model: normalizeModelIdentity(id, model).normalizedModel,
              specificity: "exact",
              contextWindow,
              maxOutputTokens: null,
            },
          ],
          failed: false,
        }
      }
      return { claims: [], failed: false }
    } catch {
      return { claims: [], failed: true }
    }
  }
}
