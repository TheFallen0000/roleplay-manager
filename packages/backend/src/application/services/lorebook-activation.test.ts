import { describe, expect, it } from "vitest"

import { estimateTextTokens } from "@workspace/shared/lib/token-estimate"
import {
  activateLorebookEntries,
  matchesKey,
  MAX_LOREBOOK_RECURSION_DEPTH,
  selectiveLogicActive,
  type LorebookActivationEntry,
} from "@workspace/shared/lib/lorebook-activation"
import { stripDecorators } from "@workspace/shared/lib/sillytavern-card"

const entry = (
  overrides: Partial<LorebookActivationEntry> = {}
): LorebookActivationEntry => ({
  id: "entry-1",
  keys: ["dragon"],
  secondaryKeys: [],
  content: "Dragons dwell in the north.",
  constant: false,
  selective: false,
  selectiveLogic: 0,
  insertionOrder: 100,
  priority: 0,
  enabled: true,
  caseSensitive: false,
  wholeWords: false,
  useRegex: false,
  order: 0,
  position: "after_char",
  ...overrides,
})

describe("matchesKey", () => {
  it("matches literal substrings case-insensitively by default", () => {
    expect(
      matchesKey("A dragon appears", "dragon", {
        caseSensitive: false,
        wholeWords: false,
      })
    ).toBe(true)
  })

  it("honours case sensitivity", () => {
    expect(
      matchesKey("A Dragon appears", "dragon", {
        caseSensitive: true,
        wholeWords: false,
      })
    ).toBe(false)
    expect(
      matchesKey("A dragon appears", "dragon", {
        caseSensitive: true,
        wholeWords: false,
      })
    ).toBe(true)
  })

  it("honours whole-word matching", () => {
    expect(
      matchesKey("A dragonfly passes", "dragon", {
        caseSensitive: false,
        wholeWords: true,
      })
    ).toBe(false)
    expect(
      matchesKey("A dragon passes", "dragon", {
        caseSensitive: false,
        wholeWords: true,
      })
    ).toBe(true)
  })

  it("does not treat the key as a regular expression", () => {
    expect(
      matchesKey("a.c", "a.*", {
        caseSensitive: false,
        wholeWords: false,
      })
    ).toBe(false)
    expect(
      matchesKey("a.* appears", "a.*", {
        caseSensitive: false,
        wholeWords: false,
      })
    ).toBe(true)
  })
})

describe("selectiveLogicActive", () => {
  const cases: Array<[0 | 1 | 2 | 3, number, number, boolean]> = [
    [0, 1, 2, true],
    [0, 0, 2, false],
    [1, 1, 2, true],
    [1, 2, 2, false],
    [2, 0, 2, true],
    [2, 1, 2, false],
    [3, 2, 2, true],
    [3, 1, 2, false],
  ]

  it.each(cases)(
    "logic %i with %i/%i secondaries is %s",
    (logic, matched, total, expected) => {
      expect(selectiveLogicActive(logic, matched, total)).toBe(expected)
    }
  )

  it("documents the degenerate n=1 collision between NOT ALL and NOT ANY", () => {
    expect(selectiveLogicActive(1, 0, 1)).toBe(true)
    expect(selectiveLogicActive(2, 0, 1)).toBe(true)
    expect(selectiveLogicActive(1, 1, 1)).toBe(false)
    expect(selectiveLogicActive(2, 1, 1)).toBe(false)
  })
})

describe("activateLorebookEntries", () => {
  it("activates a non-selective entry when a primary key matches", () => {
    const result = activateLorebookEntries({
      entries: [entry()],
      scanText: "A dragon appears",
      tokenBudget: 0,
    })

    expect(result.included.map((item) => item.id)).toEqual(["entry-1"])
    expect(result.overBudgetCount).toBe(0)
    expect(result.skipped).toBe(0)
  })

  it("ignores secondary keys when selective is false", () => {
    const result = activateLorebookEntries({
      entries: [
        entry({
          selective: false,
          secondaryKeys: ["missing"],
          selectiveLogic: 3,
        }),
      ],
      scanText: "A dragon appears",
      tokenBudget: 0,
    })

    expect(result.included).toHaveLength(1)
  })

  it("falls back to the primary match when selective has no secondary keys", () => {
    const result = activateLorebookEntries({
      entries: [entry({ selective: true, secondaryKeys: [] })],
      scanText: "A dragon appears",
      tokenBudget: 0,
    })

    expect(result.included).toHaveLength(1)
  })

  it("applies each selective_logic value with a primary match", () => {
    const scanText = "dragon and fire"
    const cases: Array<[0 | 1 | 2 | 3, string[], boolean]> = [
      [0, ["fire"], true],
      [0, ["ice"], false],
      [1, ["fire", "ice"], true],
      [1, ["fire", "dragon"], false],
      [2, ["ice"], true],
      [2, ["fire"], false],
      [3, ["fire", "dragon"], true],
      [3, ["fire", "ice"], false],
    ]

    for (const [logic, secondaryKeys, active] of cases) {
      const result = activateLorebookEntries({
        entries: [
          entry({
            selective: true,
            selectiveLogic: logic,
            secondaryKeys,
          }),
        ],
        scanText,
        tokenBudget: 0,
      })
      expect(result.included, `${logic}:${secondaryKeys.join(",")}`).toHaveLength(
        active ? 1 : 0
      )
    }
  })

  it("always activates constant entries, ignoring keys and selective", () => {
    const result = activateLorebookEntries({
      entries: [
        entry({
          constant: true,
          keys: ["missing"],
          selective: true,
          secondaryKeys: ["also-missing"],
          selectiveLogic: 3,
        }),
      ],
      scanText: "nothing relevant",
      tokenBudget: 0,
    })

    expect(result.included.map((item) => item.id)).toEqual(["entry-1"])
  })

  it("never injects empty or whitespace-only content", () => {
    const result = activateLorebookEntries({
      entries: [
        entry({ id: "empty", content: "" }),
        entry({ id: "blank", content: "   \n  " }),
        entry({ id: "constant-empty", content: " ", constant: true }),
      ],
      scanText: "dragon",
      tokenBudget: 0,
    })

    expect(result.included).toEqual([])
    expect(result.skipped).toBe(3)
  })

  it("excludes disabled entries", () => {
    const result = activateLorebookEntries({
      entries: [entry({ enabled: false })],
      scanText: "dragon",
      tokenBudget: 0,
    })

    expect(result.included).toEqual([])
  })

  it("does not activate use_regex entries, not even when constant", () => {
    const result = activateLorebookEntries({
      entries: [
        entry({ id: "regex", useRegex: true }),
        entry({ id: "regex-constant", useRegex: true, constant: true }),
      ],
      scanText: "dragon",
      tokenBudget: 0,
    })

    expect(result.included).toEqual([])
    expect(result.skipped).toBe(2)
  })

  it("orders injection by insertionOrder and then order", () => {
    const result = activateLorebookEntries({
      entries: [
        entry({ id: "late", insertionOrder: 20, order: 0 }),
        entry({ id: "first-b", insertionOrder: 10, order: 2 }),
        entry({ id: "first-a", insertionOrder: 10, order: 1 }),
      ],
      scanText: "dragon",
      tokenBudget: 0,
    })

    expect(result.included.map((item) => item.id)).toEqual([
      "first-a",
      "first-b",
      "late",
    ])
  })

  it("trims by priority desc and insertionOrder asc when over budget", () => {
    const content = "x".repeat(400)
    const entries = [
      entry({ id: "low", content, priority: 1, insertionOrder: 10 }),
      entry({ id: "mid", content, priority: 5, insertionOrder: 30 }),
      entry({ id: "high", content, priority: 9, insertionOrder: 20 }),
    ]
    const budget = estimateTextTokens(content) * 2

    const result = activateLorebookEntries({
      entries,
      scanText: "dragon",
      tokenBudget: budget,
    })

    expect(result.included.map((item) => item.id)).toEqual(["high", "mid"])
    expect(result.overBudgetCount).toBe(1)
  })

  it("treats tokenBudget 0 as unlimited", () => {
    const content = "x".repeat(5_000)

    const result = activateLorebookEntries({
      entries: [
        entry({ id: "a", content }),
        entry({ id: "b", content }),
        entry({ id: "c", content }),
      ],
      scanText: "dragon",
      tokenBudget: 0,
    })

    expect(result.included).toHaveLength(3)
    expect(result.overBudgetCount).toBe(0)
  })

  it("recurses into injected content without duplicating entries", () => {
    const entries = [
      entry({ id: "a", keys: ["alpha"], content: "beta" }),
      entry({ id: "b", keys: ["beta"], content: "gamma" }),
      entry({ id: "c", keys: ["gamma"], content: "delta" }),
      entry({ id: "d", keys: ["delta"], content: "epsilon" }),
      entry({ id: "e", keys: ["epsilon"], content: "zeta" }),
      entry({ id: "f", keys: ["zeta"], content: "alpha" }),
    ]

    const result = activateLorebookEntries({
      entries,
      scanText: "alpha",
      tokenBudget: 0,
      recursiveScanning: true,
    })

    const ids = result.included.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(1)
    expect(ids.length).toBeLessThan(entries.length)
    expect(ids.length).toBeLessThanOrEqual(MAX_LOREBOOK_RECURSION_DEPTH + 1)
  })

  it("does not recurse when recursiveScanning is false", () => {
    const result = activateLorebookEntries({
      entries: [
        entry({ id: "a", keys: ["alpha"], content: "beta" }),
        entry({ id: "b", keys: ["beta"], content: "gamma" }),
      ],
      scanText: "alpha",
      tokenBudget: 0,
      recursiveScanning: false,
    })

    expect(result.included.map((item) => item.id)).toEqual(["a"])
  })
})

describe("stripDecorators", () => {
  it("removes @@ / @@@ lines from the injected copy", () => {
    expect(stripDecorators("@@depth 4\nTexto")).toBe("Texto")
    expect(stripDecorators("@@@activate_only\n@@position 1\nTexto\nmas")).toBe(
      "Texto\nmas"
    )
  })

  it("does not mutate the stored content", () => {
    const content = "@@depth 4\nTexto"
    const stripped = stripDecorators(content)

    expect(stripped).toBe("Texto")
    expect(content).toBe("@@depth 4\nTexto")
  })
})
