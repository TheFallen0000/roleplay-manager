import { describe, expect, it } from "vitest"

import {
  normalizeContextPolicy,
  resolveContextBudget,
  type ContextPolicyId,
} from "@workspace/shared/lib/context-policy"
import { resolveCompactionTarget } from "@workspace/shared/lib/compaction"
import { resolveEffectiveWindow } from "@workspace/shared/lib/context-window"

const POLICIES: ContextPolicyId[] = ["fast", "balanced", "deep"]

const budget = (params: {
  policy: ContextPolicyId
  contextWindow: number | null
  workingWindow?: number | null
  maxTokens?: number | null
}) =>
  resolveContextBudget({
    policy: params.policy,
    contextWindow: params.contextWindow,
    workingWindow: params.workingWindow ?? null,
    maxTokens: params.maxTokens ?? null,
  })

const currentMemoryBudget = (window: number): number =>
  Math.min(2048, Math.max(256, Math.round(window * 0.12)))

// Mirrors `preferredSummary` in context-compaction.service.ts today. For the
// windows used here floor and round agree, so the parity is exact.
const currentSummaryBudget = (window: number): number =>
  Math.min(1024, Math.max(256, Math.floor(window * 0.1)))

describe("normalizeContextPolicy", () => {
  it("keeps the valid ids", () => {
    for (const policy of POLICIES) {
      expect(normalizeContextPolicy(policy)).toBe(policy)
    }
  })

  it("falls back to balanced for casing, unknown values and missing input", () => {
    expect(normalizeContextPolicy("FAST")).toBe("balanced")
    expect(normalizeContextPolicy("Deep")).toBe("balanced")
    expect(normalizeContextPolicy("turbo")).toBe("balanced")
    expect(normalizeContextPolicy("")).toBe("balanced")
    expect(normalizeContextPolicy(undefined)).toBe("balanced")
    expect(normalizeContextPolicy(null)).toBe("balanced")
  })
})

describe("resolveContextBudget ratios and clamps", () => {
  it("uses the balanced constants on medium windows", () => {
    expect(budget({ policy: "balanced", contextWindow: 4_000 })).toMatchObject({
      window: 4_000,
      memoryBudget: 480,
      summaryOutputBudget: 400,
      summaryMemoryBudget: 480,
      compactionThreshold: 80,
      compactionTarget: 60,
    })
    expect(budget({ policy: "balanced", contextWindow: 8_000 })).toMatchObject({
      window: 8_000,
      memoryBudget: 960,
      summaryOutputBudget: 800,
      summaryMemoryBudget: 960,
      compactionThreshold: 80,
      compactionTarget: 60,
    })
  })

  it("uses the fast constants on medium windows", () => {
    expect(budget({ policy: "fast", contextWindow: 4_000 })).toMatchObject({
      window: 4_000,
      memoryBudget: 240,
      summaryOutputBudget: 200,
      summaryMemoryBudget: 240,
      compactionThreshold: 70,
      compactionTarget: 50,
    })
  })

  it("uses the deep constants on medium windows", () => {
    expect(budget({ policy: "deep", contextWindow: 4_000 })).toMatchObject({
      window: 4_000,
      memoryBudget: 720,
      summaryOutputBudget: 600,
      summaryMemoryBudget: 720,
      compactionThreshold: 90,
      compactionTarget: 70,
    })
  })

  it("clamps each policy to its own minimum", () => {
    expect(budget({ policy: "fast", contextWindow: 500 })).toMatchObject({
      memoryBudget: 128,
      summaryOutputBudget: 128,
      summaryMemoryBudget: 128,
    })
    expect(budget({ policy: "balanced", contextWindow: 1_000 })).toMatchObject({
      memoryBudget: 256,
      summaryOutputBudget: 256,
      summaryMemoryBudget: 256,
    })
    expect(budget({ policy: "deep", contextWindow: 1_000 })).toMatchObject({
      memoryBudget: 256,
      summaryOutputBudget: 256,
      summaryMemoryBudget: 256,
    })
  })

  it("clamps each policy to its own maximum on a large window", () => {
    expect(budget({ policy: "fast", contextWindow: 32_000 })).toMatchObject({
      memoryBudget: 1_024,
      summaryOutputBudget: 512,
      summaryMemoryBudget: 1_024,
    })
    expect(budget({ policy: "balanced", contextWindow: 32_000 })).toMatchObject(
      {
        memoryBudget: 2_048,
        summaryOutputBudget: 1_024,
        summaryMemoryBudget: 2_048,
      },
    )
    expect(budget({ policy: "deep", contextWindow: 32_000 })).toMatchObject({
      memoryBudget: 4_096,
      summaryOutputBudget: 2_048,
      summaryMemoryBudget: 4_096,
    })
  })

  it("matches the current memory and summary constants with balanced", () => {
    for (const window of [4_000, 8_000, 32_000]) {
      const plan = budget({ policy: "balanced", contextWindow: window })
      expect(plan.memoryBudget).toBe(currentMemoryBudget(window))
      expect(plan.summaryOutputBudget).toBe(currentSummaryBudget(window))
    }
  })

  it("floors only summaryOutput and keeps round for memory sections", () => {
    const plan = budget({
      policy: "balanced",
      contextWindow: 8_192,
      workingWindow: 5_735,
      maxTokens: 2_048,
    })

    // 5735 * 0.1 = 573.5 -> 573 (S122 floor). 5735 * 0.12 = 688.2 -> 688.
    expect(plan.summaryOutputBudget).toBe(573)
    expect(plan.memoryBudget).toBe(688)
    expect(plan.summaryMemoryBudget).toBe(688)
  })

  it("keeps the policy defaults free of a second compaction margin", () => {
    for (const policy of POLICIES) {
      const plan = budget({ policy, contextWindow: 8_000 })
      expect(plan.compactionTarget).toBe(
        resolveCompactionTarget(plan.compactionThreshold),
      )
    }
    expect(resolveCompactionTarget(85)).toBe(65)
  })
})

describe("resolveContextBudget effective window", () => {
  it("resolves window and output reserve through resolveEffectiveWindow", () => {
    const raw = budget({
      policy: "balanced",
      contextWindow: 8_000,
      maxTokens: 1_000,
    })
    const expectedRaw = resolveEffectiveWindow({
      contextWindow: 8_000,
      workingWindow: null,
      maxTokens: 1_000,
    })
    expect(raw.window).toBe(expectedRaw.window)
    expect(raw.outputReserve).toBe(expectedRaw.outputReserve)
    expect(raw.outputReserve).toBe(1_000)

    const net = budget({
      policy: "balanced",
      contextWindow: 8_192,
      workingWindow: 5_735,
      maxTokens: 2_048,
    })
    const expectedNet = resolveEffectiveWindow({
      contextWindow: 8_192,
      workingWindow: 5_735,
      maxTokens: 2_048,
    })
    expect(net.window).toBe(5_735)
    expect(net.outputReserve).toBe(0)
    expect(expectedNet.net).toBe(true)
  })

  it("applies the ratios to the effective window, not the raw one", () => {
    const plan = budget({
      policy: "balanced",
      contextWindow: 8_192,
      workingWindow: 5_735,
      maxTokens: 2_048,
    })

    expect(plan).toMatchObject({
      window: 5_735,
      outputReserve: 0,
      memoryBudget: Math.min(2048, Math.max(256, Math.round(5_735 * 0.12))),
      // S122 parity: the summary output budget floors (5_735 * 0.1 = 573.5).
      summaryOutputBudget: Math.min(1024, Math.max(256, Math.floor(5_735 * 0.1))),
      summaryMemoryBudget: Math.min(
        2048,
        Math.max(256, Math.round(5_735 * 0.12)),
      ),
    })
    expect(plan.memoryBudget).toBe(688)
    expect(plan.summaryOutputBudget).toBe(573)
    expect(plan.summaryMemoryBudget).toBe(688)
  })

  it("falls back to the raw window when the working window is unsafe", () => {
    const plan = budget({
      policy: "balanced",
      contextWindow: 8_000,
      workingWindow: 7_000,
      maxTokens: 2_048,
    })

    expect(plan.window).toBe(8_000)
    expect(plan.outputReserve).toBe(2_048)
    expect(plan.memoryBudget).toBe(960)
  })
})

describe("resolveContextBudget unknown window", () => {
  it.each([
    ["fast", { memory: 256, summaryOutput: 128, summaryMemory: 256 }],
    ["balanced", { memory: 512, summaryOutput: 256, summaryMemory: 512 }],
    ["deep", { memory: 1_024, summaryOutput: 512, summaryMemory: 1_024 }],
  ] as const)(
    "uses the %s fallbacks when contextWindow is null",
    (policy, fallbacks) => {
      const plan = budget({ policy, contextWindow: null })

      expect(plan).toMatchObject({
        window: null,
        outputReserve: 2_048,
        memoryBudget: fallbacks.memory,
        summaryOutputBudget: fallbacks.summaryOutput,
        summaryMemoryBudget: fallbacks.summaryMemory,
        compactionThreshold: policy === "fast" ? 70 : policy === "deep" ? 90 : 80,
        compactionTarget: policy === "fast" ? 50 : policy === "deep" ? 70 : 60,
      })
    },
  )

  it("ignores an unsafe working window when there is no raw window", () => {
    const plan = budget({
      policy: "deep",
      contextWindow: null,
      workingWindow: 5_735,
      maxTokens: 2_048,
    })

    expect(plan.window).toBeNull()
    expect(plan.outputReserve).toBe(2_048)
    expect(plan.memoryBudget).toBe(1_024)
    expect(plan.summaryOutputBudget).toBe(512)
    expect(plan.summaryMemoryBudget).toBe(1_024)
  })
})

describe("resolveContextBudget invariants", () => {
  it("is pure and deterministic across two calls", () => {
    const input = {
      policy: "deep" as ContextPolicyId,
      contextWindow: 4_000,
      workingWindow: null,
      maxTokens: 2_048,
    }
    const snapshot = { ...input }

    const first = resolveContextBudget(input)
    const second = resolveContextBudget(input)

    expect(second).toEqual(first)
    expect(input).toEqual(snapshot)
  })

  it("never lets the three policy sections exceed the window for deep", () => {
    const plan = budget({
      policy: "deep",
      contextWindow: 4_000,
      maxTokens: 2_048,
    })

    // Each cap stays inside its own max and above its min.
    expect(plan.memoryBudget).toBeLessThanOrEqual(4_096)
    expect(plan.summaryOutputBudget).toBeLessThanOrEqual(2_048)
    expect(plan.summaryMemoryBudget).toBeLessThanOrEqual(4_096)
    expect(plan.memoryBudget).toBeGreaterThanOrEqual(256)
    expect(plan.summaryOutputBudget).toBeGreaterThanOrEqual(256)
    expect(plan.summaryMemoryBudget).toBeGreaterThanOrEqual(256)

    // Messages absorb the residue, so the policy sections alone must fit.
    expect(
      plan.memoryBudget + plan.summaryOutputBudget + plan.summaryMemoryBudget,
    ).toBeLessThanOrEqual(plan.window ?? 0)
  })

  it("clamps the deep budget on a net window without overflowing it", () => {
    const plan = budget({
      policy: "deep",
      contextWindow: 4_000,
      workingWindow: 1_500,
      maxTokens: 500,
    })

    expect(plan.window).toBe(1_500)
    expect(plan.outputReserve).toBe(0)
    expect(
      plan.memoryBudget + plan.summaryOutputBudget + plan.summaryMemoryBudget,
    ).toBeLessThanOrEqual(1_500)
  })
})
