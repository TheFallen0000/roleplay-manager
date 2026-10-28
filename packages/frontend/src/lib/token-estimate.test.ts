import { describe, expect, it } from "vitest"

import {
  estimateContextTokens,
  estimateMessagesTokens,
  estimateTextTokens,
} from "@workspace/shared/lib/token-estimate"

describe("token estimate", () => {
  it("over-estimates text with the conservative heuristic", () => {
    expect(estimateTextTokens("")).toBe(0)
    expect(estimateTextTokens("a".repeat(300))).toBe(110)
    expect(estimateTextTokens("Hola mundo")).toBe(4)
  })

  it("adds per-message overhead", () => {
    expect(
      estimateMessagesTokens([
        { content: "a".repeat(30) },
        { content: "b".repeat(30) },
      ]),
    ).toBe(30)
  })

  it("builds the full context estimate with the reply reserve", () => {
    const result = estimateContextTokens({
      systemPrompt: "a".repeat(300),
      messages: [{ content: "b".repeat(30) }],
      outputReserve: 1000,
      contextWindow: 4000,
    })

    expect(result).toEqual({
      systemTokens: 110,
      messageTokens: 15,
      inputTokens: 125,
      outputReserve: 1000,
      totalTokens: 1125,
      contextWindow: 4000,
      contextPercent: 28,
    })
  })

  it("keeps the percentage null without a window", () => {
    const result = estimateContextTokens({
      systemPrompt: "hello",
      messages: [],
      outputReserve: 10,
      contextWindow: null,
    })

    expect(result.contextWindow).toBeNull()
    expect(result.contextPercent).toBeNull()
  })
})
