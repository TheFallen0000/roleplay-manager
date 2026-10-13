import { describe, expect, it } from "vitest"

import { buildPlayerCharacterExport } from "./player-character-export"
import { parsePlayerCharacterExport } from "./parse-player-character-export"

const validPayload = {
  schemaVersion: 1,
  kind: "player-character-export",
  exportedAt: "2026-10-13T12:00:00.000Z",
  playerCharacter: {
    name: "Alice",
    description: "Una exploradora curiosa.",
  },
}

describe("parsePlayerCharacterExport", () => {
  it("round-trips what the export builder produces", () => {
    const payload = buildPlayerCharacterExport(
      {
        name: "Alice",
        description: "Una exploradora curiosa.",
      },
      new Date("2026-10-13T12:00:00.000Z"),
    )

    const parsed = parsePlayerCharacterExport(JSON.stringify(payload), "es")

    expect(parsed).toEqual({ ok: true, payload })
  })

  it("rejects invalid JSON and non-objects", () => {
    expect(parsePlayerCharacterExport("no-json", "es")).toEqual({
      ok: false,
      error: "El archivo no es un JSON válido.",
    })
    expect(parsePlayerCharacterExport("42", "es")).toEqual({
      ok: false,
      error: "El archivo no contiene un objeto JSON válido.",
    })
  })

  it("rejects a different kind", () => {
    const parsed = parsePlayerCharacterExport(
      JSON.stringify({ ...validPayload, kind: "character-export" }),
      "es",
    )

    expect(parsed).toEqual({
      ok: false,
      error: "El archivo no es una exportación de persona compatible.",
    })
  })

  it("rejects an unsupported schema version", () => {
    const parsed = parsePlayerCharacterExport(
      JSON.stringify({ ...validPayload, schemaVersion: 7 }),
      "es",
    )

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.error).toContain("7")
      expect(parsed.error).toContain("1")
    }
  })

  it("requires the name and the description", () => {
    expect(
      parsePlayerCharacterExport(
        JSON.stringify({
          ...validPayload,
          playerCharacter: { name: "", description: "Algo" },
        }),
        "es",
      ),
    ).toEqual({
      ok: false,
      error: "El archivo no incluye el nombre de la persona.",
    })

    expect(
      parsePlayerCharacterExport(
        JSON.stringify({
          ...validPayload,
          playerCharacter: { name: "Alice", description: "" },
        }),
        "es",
      ),
    ).toEqual({
      ok: false,
      error: "El archivo no incluye la descripción de la persona.",
    })
  })
})
