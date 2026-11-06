import type { CapabilityClaim } from "@workspace/shared/types/model-capabilities"

/** Probe claims are cheap to re-detect, but not on every dialog opening. */
export const DEFAULT_CAPABILITIES_CACHE_TTL_MS = 15 * 60_000

export interface CachedCapabilityClaim {
  claim: CapabilityClaim
  cachedAt: number
}

export const buildCapabilitiesCacheKey = (
  provider: string,
  instanceId: string | null,
  normalizedModel: string,
): string => `${provider}:${instanceId ?? ""}:${normalizedModel}`

/**
 * In-memory cache for probe claims only. Curated, heuristic and default values
 * are deterministic and never stored here; manual overrides are read fresh from
 * settings. The entry deliberately keeps just the claim and its timestamp so it
 * can never leak an instance URL or API key.
 */
export class ModelCapabilitiesCache {
  private readonly entries = new Map<string, CachedCapabilityClaim>()
  private readonly ttlMs: number
  private readonly now: () => number

  constructor(options: { ttlMs?: number; now?: () => number } = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_CAPABILITIES_CACHE_TTL_MS
    this.now = options.now ?? (() => Date.now())
  }

  get(key: string): CachedCapabilityClaim | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    return this.now() - entry.cachedAt >= this.ttlMs ? null : entry
  }

  getStale(key: string): CachedCapabilityClaim | null {
    return this.entries.get(key) ?? null
  }

  set(key: string, claim: CapabilityClaim): void {
    this.entries.set(key, { claim, cachedAt: this.now() })
  }

  invalidate(key: string): void {
    this.entries.delete(key)
  }

  invalidateInstance(instanceId: string): void {
    if (instanceId.length === 0) return
    for (const key of this.entries.keys()) {
      if (this.readInstanceId(key) === instanceId) {
        this.entries.delete(key)
      }
    }
  }

  invalidateProvider(provider: string): void {
    const prefix = `${provider}:`
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key)
      }
    }
  }

  // Key shape is `<provider>:<instanceId?>:<normalizedModel>`; the model itself
  // may contain colons (`qwen2.5:14b`), so only the first two separators count.
  private readInstanceId(key: string): string {
    const providerEnd = key.indexOf(":")
    if (providerEnd === -1) return ""
    const instanceEnd = key.indexOf(":", providerEnd + 1)
    if (instanceEnd === -1) return ""
    return key.slice(providerEnd + 1, instanceEnd)
  }
}
