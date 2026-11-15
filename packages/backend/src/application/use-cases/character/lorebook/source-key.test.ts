import { describe, expect, it } from "vitest"

import type { NormalizedLorebook } from "./lorebook.mapper"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "./source-key"

type RecordValue = Record<string, unknown>

const entry = (overrides: RecordValue = {}): RecordValue => ({
  name: "Dragon lore",
  sourceId: "source-1",
  keys: ["dragon"],
  secondaryKeys: [],
  comment: "Dragon lore",
  content: "Dragons dwell in the northern mountains.",
  constant: false,
  selective: false,
  selectiveLogic: 0,
  insertionOrder: 100,
  position: "after_char",
  rawPosition: "1",
  priority: 0,
  enabled: true,
  caseSensitive: false,
  wholeWords: false,
  order: 0,
  extensions: {},
  unknownFields: null,
  ...overrides,
})

const book = (overrides: RecordValue = {}): NormalizedLorebook =>
  ({
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    extensions: {},
    unknownFields: null,
    entries: [
      entry(),
      entry({
        name: "River lore",
        sourceId: "source-2",
        keys: ["river"],
        comment: "River lore",
        content: "The river is old.",
        order: 1,
        rawPosition: "2",
      }),
    ],
    ...overrides,
  }) as never

const keyFor = (value: unknown): string =>
  computeLorebookSourceKey(canonicalizeLorebookContent(value as never))

const reverseKeys = (value: RecordValue): RecordValue =>
  Object.fromEntries(Object.entries(value).reverse())

describe("lorebook source key", () => {
  it("is stable when JSON key order changes", () => {
    const original = book()
    const reordered = reverseKeys({
      ...original,
      entries: original.entries.map((item) =>
        reverseKeys(item as unknown as RecordValue),
      ),
    })

    expect(keyFor(reordered)).toBe(keyFor(original))
  })

  it("excludes local ids and timestamps from the identity", () => {
    const original = book()
    const withLocalNoise = {
      ...original,
      id: "local-book-id",
      created_at: 1_700_000_000,
      updated_at: 1_700_000_001,
      entries: original.entries.map((item, index) => ({
        ...item,
        id: `local-entry-${index}`,
        source_id: `local-source-${index}`,
        lorebook_id: "local-book-id",
        created_at: 1_700_000_000,
        updated_at: 1_700_000_001,
      })),
    }

    expect(keyFor(withLocalNoise)).toBe(keyFor(original))
  })

  it("ignores numeric order values when the relative order is unchanged", () => {
    const original = book()
    const shiftedOrders = {
      ...original,
      entries: [
        { ...original.entries[0], order: 10 },
        { ...original.entries[1], order: 20 },
      ],
    }

    expect(keyFor(shiftedOrders)).toBe(keyFor(original))
  })

  it("changes when the relative order of entries changes", () => {
    const original = book()
    const reordered = {
      ...original,
      entries: [
        { ...original.entries[0], order: 1 },
        { ...original.entries[1], order: 0 },
      ],
    }

    expect(keyFor(reordered)).not.toBe(keyFor(original))
  })

  it("changes when content or settings change", () => {
    const original = book()
    const cases: NormalizedLorebook[] = [
      {
        ...original,
        entries: [
          { ...original.entries[0], content: "Dragons are extinct." },
          original.entries[1],
        ],
      },
      book({ scanDepth: 8 }),
      book({ tokenBudget: 900 }),
      book({ recursiveScanning: true }),
      book({ name: "Other lore" }),
      book({ description: "Other description" }),
    ]

    for (const value of cases) {
      expect(keyFor(value)).not.toBe(keyFor(original))
    }
  })

  it("returns a deterministic 64-character SHA-256 hex digest", () => {
    const key = keyFor(book())

    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).toBe(keyFor(book()))
  })
})
