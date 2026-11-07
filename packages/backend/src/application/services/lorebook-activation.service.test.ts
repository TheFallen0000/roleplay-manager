import { describe, expect, it } from "vitest"

import { estimateTextTokens } from "@workspace/shared/lib/token-estimate"

import { LorebookActivationService } from "./lorebook-activation.service"

interface ScannedMessage {
  role: "user" | "assistant"
  content: string
}

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  keys: ["dragon"],
  secondaryKeys: [],
  content: "Dragons dwell in the north.",
  constant: false,
  selective: false,
  selectiveLogic: 0 as const,
  insertionOrder: 100,
  priority: 0,
  enabled: true,
  caseSensitive: false,
  wholeWords: false,
  useRegex: false,
  order: 0,
  position: "after_char" as const,
  unknownFields: null,
  ...overrides,
})

const book = (overrides: Record<string, unknown> = {}) => ({
  scanDepth: 4,
  tokenBudget: 0,
  recursiveScanning: false,
  ...overrides,
})

const service = new LorebookActivationService()

describe("LorebookActivationService — scan depth", () => {
  const messages: ScannedMessage[] = [
    { role: "user", content: "dragon" },
    { role: "assistant", content: "nothing relevant" },
    { role: "user", content: "nothing here either" },
  ]

  it("only scans the last scanDepth messages", async () => {
    const result = await service.activate({
      book: book({ scanDepth: 1 }),
      entries: [entry()],
      messages,
    })

    expect(result.before).toEqual([])
    expect(result.after).toEqual([])

    const wider = await service.activate({
      book: book({ scanDepth: 3 }),
      entries: [entry()],
      messages,
    })
    expect(wider.after.map((item) => item.id)).toEqual(["entry-1"])
  })

  it("includes the pending message in the scanned window", async () => {
    const result = await service.activate({
      book: book({ scanDepth: 1 }),
      entries: [entry()],
      messages,
      pendingMessage: { role: "user", content: "a dragon appears" },
    })

    expect(result.after.map((item) => item.id)).toEqual(["entry-1"])
  })

  it("scanDepth 0 disables key scanning and keeps only constant entries", async () => {
    const result = await service.activate({
      book: book({ scanDepth: 0 }),
      entries: [
        entry({ id: "key-entry", constant: false }),
        entry({ id: "constant-entry", constant: true, keys: [] }),
      ],
      messages,
    })

    expect(result.after.map((item) => item.id)).toEqual(["constant-entry"])
  })

  it("scanDepth 0 still allows recursion from injected constant content", async () => {
    const result = await service.activate({
      book: book({ scanDepth: 0, recursiveScanning: true }),
      entries: [
        entry({
          id: "constant-entry",
          constant: true,
          keys: [],
          content: "a dragon is nearby",
        }),
        entry({ id: "key-entry", keys: ["dragon"] }),
      ],
      messages,
    })

    expect(result.after.map((item) => item.id)).toEqual([
      "constant-entry",
      "key-entry",
    ])
  })

  it("does not activate from a per-entry scanDepth field", async () => {
    const result = await service.activate({
      book: book({ scanDepth: 1 }),
      entries: [
        entry({
          id: "per-entry",
          unknownFields: { scanDepth: 100 },
        }),
      ],
      messages,
    })

    expect(result.after).toEqual([])
  })
})

describe("LorebookActivationService — positions and budget", () => {
  it("splits before_char and after_char and reports over-budget entries", async () => {
    const content = "x".repeat(400)
    const result = await service.activate({
      book: book({
        scanDepth: 4,
        tokenBudget: estimateTextTokens(content) + 1,
      }),
      entries: [
        entry({
          id: "before",
          position: "before_char",
          content,
          priority: 1,
        }),
        entry({
          id: "after",
          position: "after_char",
          content,
          priority: 9,
        }),
      ],
      messages: [{ role: "user", content: "dragon" }],
    })

    expect(result.before.map((item) => item.id)).toEqual([])
    expect(result.after.map((item) => item.id)).toEqual(["after"])
    expect(result.overBudgetCount).toBe(1)
  })
})
