import { describe, expect, it } from "vitest"

import {
  mentionsEmojis,
  normalizeAssistantReply,
  normalizeUserContent,
  normalizeWhitespace,
  stripEmojis,
  stripMarkdownArtifacts,
} from "./reply-format"

describe("normalizeWhitespace", () => {
  it("trims edge padding and trailing spaces", () => {
    expect(normalizeWhitespace("\n\n  Hola.  \nAdiós. \n\n")).toBe("Hola.\nAdiós.")
  })

  it("normalizes CRLF and collapses excessive blank lines", () => {
    expect(normalizeWhitespace("Uno.\r\n\r\n\r\n\r\nDos.")).toBe("Uno.\n\nDos.")
  })

  it("keeps single blank lines between paragraphs", () => {
    expect(normalizeWhitespace("Uno.\n\nDos.")).toBe("Uno.\n\nDos.")
  })
})

describe("stripMarkdownArtifacts", () => {
  it("removes heading markers", () => {
    expect(stripMarkdownArtifacts("## La carta\nTexto.")).toBe("La carta\nTexto.")
  })

  it("unwraps bold markers", () => {
    expect(stripMarkdownArtifacts("Dijo **adiós** y se fue.")).toBe(
      "Dijo adiós y se fue.",
    )
  })

  it("drops dash and plus bullet markers at line start", () => {
    expect(stripMarkdownArtifacts("- uno\n+ dos\n- tres")).toBe("uno\ndos\ntres")
  })

  it("drops a lone star bullet but keeps actions intact", () => {
    expect(stripMarkdownArtifacts("* uno\n* dos")).toBe("uno\ndos")
    expect(stripMarkdownArtifacts("*Milka cruza los brazos.*")).toBe(
      "*Milka cruza los brazos.*",
    )
    expect(stripMarkdownArtifacts("* Milka cruza los brazos *")).toBe(
      "* Milka cruza los brazos *",
    )
  })

  it("keeps plain prose untouched", () => {
    const prose = "—No pienso ir —dijo ella.\n\n*Suspira.* «Está bien.»"
    expect(stripMarkdownArtifacts(prose)).toBe(prose)
  })
})

describe("stripEmojis", () => {
  it("removes pictographs, joined sequences and flags", () => {
    expect(stripEmojis("hola 😊 mundo")).toBe("hola mundo")
    expect(stripEmojis("familia 👨‍👩‍👧 y bandada")).toBe("familia y bandada")
    expect(stripEmojis("bien 👍🏽 hecho")).toBe("bien hecho")
    expect(stripEmojis("viaje 🇪🇸 bonito")).toBe("viaje bonito")
  })

  it("cleans the padding left behind at line starts", () => {
    expect(stripEmojis("😊 Hola.\n📌 Nota al margen.")).toBe("Hola.\nNota al margen.")
  })

  it("leaves text without emojis untouched, padding included", () => {
    const prose = "—No pienso ir  —dijo ella. (por cierto: 100% seguro)"
    expect(stripEmojis(prose)).toBe(prose)
  })
})

describe("mentionsEmojis", () => {
  it("detects the instruction word in both languages", () => {
    expect(mentionsEmojis("Puede usar emojis cuando esté feliz.")).toBe(true)
    expect(mentionsEmojis("Uses emojis sparingly.")).toBe(true)
    expect(mentionsEmojis("Habla con emoticonos.")).toBe(true)
  })

  it("returns false when nothing mentions them", () => {
    expect(mentionsEmojis("Es una guerrera seria.")).toBe(false)
    expect(mentionsEmojis("")).toBe(false)
    expect(mentionsEmojis(null)).toBe(false)
    expect(mentionsEmojis(undefined)).toBe(false)
  })
})

describe("normalizeAssistantReply", () => {
  it("composes markdown, emoji and whitespace cleanup", () => {
    const nasty = "\n\n## Título\n**Hola** 😊\n- item uno\n- item dos\n\n*Sonríe.*\n\n"
    expect(normalizeAssistantReply(nasty)).toBe(
      "Título\nHola\nitem uno\nitem dos\n\n*Sonríe.*",
    )
  })

  it("keeps emojis when the instructions allow them", () => {
    expect(
      normalizeAssistantReply("¡Qué alegría! 😊\n", { allowEmojis: true }),
    ).toBe("¡Qué alegría! 😊")
  })
})

describe("normalizeUserContent", () => {
  it("only tidies whitespace", () => {
    expect(normalizeUserContent("  \n**Hola** 😊\n\n\n> cita\n  ")).toBe(
      "**Hola** 😊\n\n> cita",
    )
  })
})
