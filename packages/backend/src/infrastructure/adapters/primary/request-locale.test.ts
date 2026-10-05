import { describe, expect, it } from "vitest"

import { resolveRequestLocale } from "./request-locale"

describe("resolveRequestLocale", () => {
  it("resuelve es y sus variantes regionales", () => {
    expect(resolveRequestLocale("es")).toBe("es")
    expect(resolveRequestLocale("es-ES")).toBe("es")
    expect(resolveRequestLocale("es-419,es;q=0.9")).toBe("es")
  })

  it("resuelve en y cae al idioma por defecto", () => {
    expect(resolveRequestLocale("en-US,en;q=0.9")).toBe("en")
    expect(resolveRequestLocale("fr-FR")).toBe("en")
    expect(resolveRequestLocale("*")).toBe("en")
    expect(resolveRequestLocale(undefined)).toBe("en")
    expect(resolveRequestLocale("")).toBe("en")
  })
})
