import { describe, expect, it } from "vitest"

import type {
  CapabilityClaim,
  CuratedModelEntry,
} from "@workspace/shared/types/model-capabilities"
import {
  normalizeModelIdentity,
  resolveModelCapabilities,
} from "@workspace/shared/lib/model-capabilities"

describe("normalizeModelIdentity", () => {
  it("lowercases, trims and collapses spaces while preserving tags", () => {
    expect(normalizeModelIdentity("ollama", "Qwen2.5:14B")).toEqual({
      provider: "ollama",
      instanceId: null,
      normalizedModel: "qwen2.5:14b",
    })
    expect(normalizeModelIdentity("ollama", "  LLaMA  3  70B ")).toEqual({
      provider: "ollama",
      instanceId: null,
      normalizedModel: "llama 3 70b",
    })
  })

  it("keeps the instance id and strips the OpenRouter routing prefix", () => {
    expect(
      normalizeModelIdentity("openai-compatible", "gpt-4o-mini", "i1")
    ).toEqual({
      provider: "openai-compatible",
      instanceId: "i1",
      normalizedModel: "gpt-4o-mini",
    })
    expect(
      normalizeModelIdentity(
        "openai-compatible",
        "openrouter/anthropic/claude-3.5-sonnet"
      )
    ).toEqual({
      provider: "openai-compatible",
      instanceId: null,
      normalizedModel: "anthropic/claude-3.5-sonnet",
    })
  })
})

describe("resolveModelCapabilities", () => {
  it("resolves context window and max output independently by source precedence", () => {
    const runtimeClaim: CapabilityClaim = {
      source: "runtime-introspection",
      confidence: "high",
      model: "gpt-4o-mini",
      specificity: "exact",
      contextWindow: 32_768,
      maxOutputTokens: null,
    }
    const providerClaim: CapabilityClaim = {
      source: "provider-api",
      confidence: "medium",
      model: "gpt-4o-mini",
      specificity: "exact",
      contextWindow: 128_000,
      maxOutputTokens: 16_000,
    }
    const curatedTable: CuratedModelEntry[] = [
      { model: "gpt-4o-mini", contextWindow: 128_000, maxOutputTokens: 16_384 },
    ]

    const result = resolveModelCapabilities({
      target: { provider: "openai-compatible", model: "gpt-4o-mini" },
      claims: [providerClaim, runtimeClaim],
      curatedTable,
      heuristic: { contextWindow: 32_768 },
      defaults: { contextWindow: 8_192, maxOutputTokens: 4_096 },
    })

    expect(result.contextWindow).toBe(runtimeClaim.contextWindow)
    expect(result.contextWindowSource).toBe("runtime-introspection")
    expect(result.contextWindowConfidence).toBe("high")
    expect(result.maxOutputTokens).toBe(16_000)
    expect(result.maxOutputTokensSource).toBe("provider-api")
    expect(result.maxOutputTokensConfidence).toBe("medium")
    expect(result.confidence).toBe("high")
    expect(result.warnings).toEqual([])
  })

  it("lets a manual override win every other source per field", () => {
    const runtimeClaim: CapabilityClaim = {
      source: "runtime-introspection",
      confidence: "high",
      model: "llama3",
      specificity: "exact",
      contextWindow: 32_768,
      maxOutputTokens: 8_192,
    }

    const result = resolveModelCapabilities({
      target: { provider: "ollama", model: "llama3" },
      claims: [runtimeClaim],
      override: { contextWindow: 65_536 },
      defaults: { contextWindow: 8_192, maxOutputTokens: 4_096 },
    })

    expect(result.contextWindow).toBe(65_536)
    expect(result.contextWindowSource).toBe("manual-override")
    expect(result.contextWindowConfidence).toBe("high")
    expect(result.maxOutputTokens).toBe(8_192)
    expect(result.maxOutputTokensSource).toBe("runtime-introspection")
  })

  it("prefers the most specific curated entry for the same source", () => {
    const curatedTable: CuratedModelEntry[] = [
      { model: "qwen2.5", contextWindow: 32_768 },
      { model: "qwen2.5:14b", contextWindow: 8_192 },
    ]

    const result = resolveModelCapabilities({
      target: { provider: "ollama", model: "qwen2.5:14b" },
      curatedTable,
    })

    expect(result.contextWindow).toBe(8_192)
    expect(result.contextWindowSource).toBe("curated-table")
    expect(result.contextWindowConfidence).toBe("medium")
  })

  it("keeps the earliest entry when two curated entries have the same specificity", () => {
    const curatedTable: CuratedModelEntry[] = [
      { model: "gpt-4o-mini", contextWindow: 32_768 },
      { model: "gpt-4o-mini", contextWindow: 16_384 },
    ]

    const result = resolveModelCapabilities({
      target: { provider: "openai-compatible", model: "gpt-4o-mini" },
      curatedTable,
    })

    expect(result.contextWindow).toBe(32_768)
  })

  it("falls back to the default source without throwing when no probe claim matches", () => {
    const result = resolveModelCapabilities({
      target: { provider: "openai-compatible", model: "unknown-model" },
      claims: [],
      curatedTable: [],
      heuristic: null,
      defaults: { contextWindow: 8_192 },
    })

    expect(result.contextWindow).toBe(8_192)
    expect(result.contextWindowSource).toBe("default")
    expect(result.contextWindowConfidence).toBe("low")
    expect(result.maxOutputTokens).toBeNull()
    expect(result.maxOutputTokensSource).toBeNull()
    expect(result.maxOutputTokensConfidence).toBeNull()
  })
})
