import { describe, it, expect } from "vitest"

import { parseCharacterExport } from "./parse-character-export"

const validPayload = {
  schemaVersion: 1,
  kind: "character-export",
  exportedAt: "2026-08-12T10:00:00.000Z",
  character: {
    id: "char-1",
    name: "Lyra",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  definition: {
    id: "ver-1",
    characterId: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    description: "Una guardiana",
    instructions: null,
    greeting: "Hola",
    versionNumber: 1,
    createdAt: "2026-08-01T10:00:00.000Z",
    cards: [],
  },
}

describe("parseCharacterExport", () => {
  it("acepta una exportación válida", () => {
    const result = parseCharacterExport(JSON.stringify(validPayload))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.character.name).toBe("Lyra")
    }
  })

  it("rechaza texto que no es JSON", () => {
    const result = parseCharacterExport("no soy json", "es")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("JSON válido")
    }
  })

  it("usa el idioma por defecto (inglés) cuando no se indica locale", () => {
    const result = parseCharacterExport("no soy json")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("valid JSON")
    }
  })

  it("rechaza un kind distinto", () => {
    const result = parseCharacterExport(
      JSON.stringify({ ...validPayload, kind: "otra-cosa" }),
      "es",
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("no es una exportación de personaje")
    }
  })

  it("rechaza una schemaVersion no soportada", () => {
    const result = parseCharacterExport(
      JSON.stringify({ ...validPayload, schemaVersion: 42 }),
      "es",
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("Versión de archivo no soportada")
    }
  })

  it("rechaza un archivo sin definición ni versiones", () => {
    const withoutVersions = { ...validPayload, definition: undefined }
    const result = parseCharacterExport(
      JSON.stringify(withoutVersions),
      "es",
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("definición del personaje")
    }
  })
})
