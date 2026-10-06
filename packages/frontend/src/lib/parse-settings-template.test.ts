import { describe, it, expect } from "vitest"

import { parseSettingsTemplate } from "./parse-settings-template"

const template = {
  schemaVersion: 1,
  kind: "character-export",
  exportedAt: "2026-10-06T10:00:00.000Z",
  character: {
    id: "char-1",
    name: "Lyra",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
  },
  standaloneSettings: {
    model: "gpt-4o-mini",
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 10,
    summaryFrequency: 20,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    memoryDecayMode: "silent",
    memoryDecayThreshold: 3,
    memoryDecayAgeThreshold: 30,
    memoryDecaySpeed: 10,
  },
}

describe("parseSettingsTemplate", () => {
  it("accepts a valid settings template", () => {
    const result = parseSettingsTemplate(JSON.stringify(template), "es")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.settings.model).toBe("gpt-4o-mini")
      expect(result.settings.temperature).toBe(0.7)
    }
  })

  it("rejects a file without a settings template", () => {
    const { standaloneSettings: _omitted, ...rest } = template
    const result = parseSettingsTemplate(JSON.stringify(rest), "es")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("plantilla de ajustes")
    }
  })

  it("rejects a different export kind", () => {
    const result = parseSettingsTemplate(
      JSON.stringify({ ...template, kind: "otra-cosa" }),
      "es",
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("no es una exportación de personaje")
    }
  })

  it("rejects an unsupported schema version", () => {
    const result = parseSettingsTemplate(
      JSON.stringify({ ...template, schemaVersion: 42 }),
      "es",
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("Versión de archivo no soportada")
    }
  })

  it("falls back to the default locale for invalid JSON", () => {
    const result = parseSettingsTemplate("not json")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("valid JSON")
    }
  })
})
