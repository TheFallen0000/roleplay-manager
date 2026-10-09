import { describe, it, expect } from "vitest"

import type { CharacterSummary } from "@workspace/shared/types/character"

import { sortCharacters } from "./sort-characters"

const character = (
  id: string,
  createdAt: string,
): CharacterSummary => ({
  id,
  name: id,
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
  createdAt,
  updatedAt: createdAt,
})

const oldCharacter = character("old", "2026-01-01T10:00:00.000Z")
const newCharacter = character("new", "2026-06-01T10:00:00.000Z")

describe("sortCharacters", () => {
  it("ordena por recencia descendente por defecto (max creación/actividad)", () => {
    const activity = new Map([["old", "2026-08-01T10:00:00.000Z"]])
    const result = sortCharacters([newCharacter, oldCharacter], activity)

    expect(result.map((c) => c.id)).toEqual(["old", "new"])
  })

  it("ordena por recencia ascendente", () => {
    const activity = new Map([["old", "2026-08-01T10:00:00.000Z"]])
    const result = sortCharacters(
      [newCharacter, oldCharacter],
      activity,
      "recency-asc",
    )

    expect(result.map((c) => c.id)).toEqual(["new", "old"])
  })

  it("ordena por última actividad descendente con fallback a creación", () => {
    const activity = new Map([["old", "2026-03-01T10:00:00.000Z"]])
    const result = sortCharacters(
      [newCharacter, oldCharacter],
      activity,
      "activity-desc",
    )

    // newCharacter has no activity -> uses its creation (June), which is more recent
    expect(result.map((c) => c.id)).toEqual(["new", "old"])
  })

  it("ordena por última actividad ascendente", () => {
    const activity = new Map([
      ["new", "2026-02-01T10:00:00.000Z"],
      ["old", "2026-08-01T10:00:00.000Z"],
    ])
    const result = sortCharacters(
      [newCharacter, oldCharacter],
      activity,
      "activity-asc",
    )

    expect(result.map((c) => c.id)).toEqual(["new", "old"])
  })

  it("no muta el arreglo original", () => {
    const input = [newCharacter, oldCharacter]
    sortCharacters(input, new Map())

    expect(input.map((c) => c.id)).toEqual(["new", "old"])
  })
})
