import { describe, expect, it } from "vitest"

import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"

import {
  buildPlayerCharacterExport,
  playerCharacterExportFilename,
} from "./player-character-export"

const alice: PlayerCharacterDTO = {
  id: "pc-1",
  name: "  Alice ",
  description: "  Una exploradora curiosa.  ",
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
}

describe("buildPlayerCharacterExport", () => {
  it("builds the standalone payload with the name and description trimmed", () => {
    const payload = buildPlayerCharacterExport(
      alice,
      new Date("2026-10-13T12:00:00.000Z"),
    )

    expect(payload).toEqual({
      schemaVersion: 1,
      kind: "player-character-export",
      exportedAt: "2026-10-13T12:00:00.000Z",
      playerCharacter: {
        name: "Alice",
        description: "Una exploradora curiosa.",
      },
    })
  })
})

describe("playerCharacterExportFilename", () => {
  it("slugifies the name and appends the date", () => {
    expect(
      playerCharacterExportFilename(
        "Ámbar Núñez",
        "persona",
        new Date("2026-10-13T12:00:00.000Z"),
      ),
    ).toBe("persona-ambar-nunez-2026-10-13.json")
  })

  it("falls back when the name has no slug", () => {
    expect(
      playerCharacterExportFilename(
        "¿?",
        "persona",
        new Date("2026-10-13T12:00:00.000Z"),
      ),
    ).toBe("persona-persona-2026-10-13.json")
  })
})
