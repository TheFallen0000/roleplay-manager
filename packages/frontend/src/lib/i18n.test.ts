import { describe, it, expect } from "vitest"

import {
  DEFAULT_LOCALE,
  en,
  es,
  isLocale,
  translate,
  type Locale,
} from "@workspace/shared/i18n"

function keyPaths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix]
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) =>
      keyPaths(value, prefix ? `${prefix}.${key}` : key),
    )
  }
  return []
}

describe("i18n core", () => {
  it("el idioma por defecto es inglés", () => {
    expect(DEFAULT_LOCALE).toBe("en")
  })

  it("es y en tienen exactamente las mismas claves", () => {
    expect(keyPaths(es).sort()).toEqual(keyPaths(en).sort())
  })

  it("valida locales soportados", () => {
    expect(isLocale("en")).toBe(true)
    expect(isLocale("es")).toBe(true)
    expect(isLocale("fr")).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it("traduce por locale", () => {
    expect(translate("en", "common.save")).toBe("Save")
    expect(translate("es", "common.save")).toBe("Guardar")
  })

  it("interpola parámetros", () => {
    expect(
      translate("en", "characters.imported", { name: "Lyra" }),
    ).toBe('Character "Lyra" imported.')
    expect(translate("es", "characters.noResults", { term: "zzz" })).toBe(
      'No hay personajes que coincidan con "zzz".',
    )
  })

  it("elige la forma singular/plural según count", () => {
    expect(translate("en", "characters.count", { count: 1 })).toBe("1 character")
    expect(translate("en", "characters.count", { count: 4 })).toBe("4 characters")
    expect(translate("es", "characters.count", { count: 1 })).toBe("1 personaje")
    expect(translate("es", "characters.count", { count: 4 })).toBe("4 personajes")
  })

  it("devuelve la clave cuando falta la traducción", () => {
    expect(translate("en", "does.not.exist")).toBe("does.not.exist")
  })

  it("cae al idioma por defecto con un locale desconocido", () => {
    expect(translate("fr" as Locale, "common.save")).toBe("Save")
  })
})
