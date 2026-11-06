import { describe, expect, it } from "vitest"

import type { CapabilityClaim } from "@workspace/shared/types/model-capabilities"

import {
  buildCapabilitiesCacheKey,
  ModelCapabilitiesCache,
} from "./model-capabilities-cache.service"

const claim: CapabilityClaim = {
  source: "runtime-introspection",
  confidence: "high",
  model: "gpt-4o-mini",
  specificity: "exact",
  contextWindow: 32_768,
  maxOutputTokens: null,
}

const otherClaim: CapabilityClaim = {
  source: "runtime-introspection",
  confidence: "high",
  model: "llama3",
  specificity: "exact",
  contextWindow: 8_192,
  maxOutputTokens: null,
}

const openaiKey = buildCapabilitiesCacheKey(
  "openai-compatible",
  "inst-1",
  "gpt-4o-mini"
)
const ollamaKey = buildCapabilitiesCacheKey("ollama", null, "llama3")

describe("buildCapabilitiesCacheKey", () => {
  it("namespaces provider, instance id and normalized model", () => {
    expect(openaiKey).toBe("openai-compatible:inst-1:gpt-4o-mini")
    expect(ollamaKey).toBe("ollama::llama3")
  })
})

describe("ModelCapabilitiesCache", () => {
  it("returns the cached claim and timestamp on a hit", () => {
    let now = 100
    const cache = new ModelCapabilitiesCache({ ttlMs: 1_000, now: () => now })
    cache.set(openaiKey, claim)

    expect(cache.get(openaiKey)).toEqual({ claim, cachedAt: 100 })
    expect(cache.get(openaiKey)?.claim).toEqual(claim)

    now = 999
    expect(cache.get(openaiKey)).not.toBeNull()
  })

  it("expires the entry once the injected clock passes the ttl", () => {
    let now = 0
    const cache = new ModelCapabilitiesCache({ ttlMs: 1_000, now: () => now })
    cache.set(openaiKey, claim)

    now = 1_001

    expect(cache.get(openaiKey)).toBeNull()
  })

  it("keeps the expired entry available through getStale", () => {
    let now = 0
    const cache = new ModelCapabilitiesCache({ ttlMs: 1_000, now: () => now })
    cache.set(openaiKey, claim)

    now = 1_001

    expect(cache.get(openaiKey)).toBeNull()
    expect(cache.getStale(openaiKey)).toEqual({ claim, cachedAt: 0 })
  })

  it("returns null from getStale for an unknown key", () => {
    const cache = new ModelCapabilitiesCache({ now: () => 0 })

    expect(cache.getStale("unknown:key:model")).toBeNull()
  })

  it("invalidates one key", () => {
    const cache = new ModelCapabilitiesCache({ now: () => 0 })
    cache.set(openaiKey, claim)

    cache.invalidate(openaiKey)

    expect(cache.get(openaiKey)).toBeNull()
  })

  it("purges every entry of one provider instance", () => {
    const cache = new ModelCapabilitiesCache({ now: () => 0 })
    cache.set(openaiKey, claim)
    cache.set(ollamaKey, otherClaim)

    cache.invalidateInstance("inst-1")

    expect(cache.get(openaiKey)).toBeNull()
    expect(cache.get(ollamaKey)).toEqual({ claim: otherClaim, cachedAt: 0 })
  })

  it("purges every entry of one provider", () => {
    const cache = new ModelCapabilitiesCache({ now: () => 0 })
    cache.set(openaiKey, claim)
    cache.set(ollamaKey, otherClaim)

    cache.invalidateProvider("openai-compatible")

    expect(cache.get(openaiKey)).toBeNull()
    expect(cache.get(ollamaKey)).not.toBeNull()
  })

  it("stores only the claim and its timestamp", () => {
    const now = 42
    const cache = new ModelCapabilitiesCache({ now: () => now })
    cache.set(openaiKey, claim)

    const entry = cache.get(openaiKey)

    expect(entry).toEqual({ claim, cachedAt: now })
    expect(Object.keys(entry ?? {}).sort()).toEqual(["cachedAt", "claim"])
    expect(JSON.stringify(entry)).not.toMatch(/apiKey|api_key|url/i)
  })
})
