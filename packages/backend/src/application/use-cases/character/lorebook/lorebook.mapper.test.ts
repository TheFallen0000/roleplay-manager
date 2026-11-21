import { describe, expect, it } from "vitest"

import { buildLorebookVersionEntity } from "../../../../test-utils/lorebook-fixtures"

import { toLorebookVersionDTO } from "./lorebook.mapper"

const buildVersion = (entries: unknown[]) =>
  buildLorebookVersionEntity({ entriesJson: JSON.stringify(entries) })

describe("toLorebookVersionDTO — synthetic entry ids (N1)", () => {
  it("synthesizes a stable id per position when the snapshot has no id", () => {
    const version = buildVersion([
      { sourceId: null, keys: ["alpha"], content: "First.", order: 0 },
      { sourceId: "42", keys: ["beta"], content: "Second.", order: 1 },
      { sourceId: null, keys: ["gamma"], content: "Third.", order: 2 },
    ])

    const dto = toLorebookVersionDTO(version)

    expect(dto.entries.map((entry) => entry.id)).toEqual([
      "entry-0",
      "42",
      "entry-2",
    ])
    // Stable across calls: the frontend can use the id as a React key.
    expect(
      toLorebookVersionDTO(version).entries.map((entry) => entry.id),
    ).toEqual(["entry-0", "42", "entry-2"])
  })

  it("keeps the entry order of the snapshot", () => {
    const version = buildVersion([
      { sourceId: null, keys: ["second"], content: "Second.", order: 1 },
      { sourceId: null, keys: ["first"], content: "First.", order: 0 },
    ])

    const dto = toLorebookVersionDTO(version)

    expect(dto.entries.map((entry) => entry.content)).toEqual([
      "Second.",
      "First.",
    ])
    expect(dto.entries.map((entry) => entry.id)).toEqual(["entry-0", "entry-1"])
  })
})
