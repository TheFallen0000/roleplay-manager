import { describe, expect, it } from "vitest"

import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import {
  lorebookToEditorValue,
  serializeLorebook,
} from "./character-form-fields"

const lorebook: LorebookDTO = {
  id: "book-1",
  characterId: "char-1",
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 8,
  tokenBudget: 900,
  recursiveScanning: true,
  extensions: { source: "import" },
  unknownFields: { book_custom: { keep: true } },
  entries: [
    {
      id: "entry-1",
      name: "Dragon lore",
      sourceId: "7",
      keys: ["dragon"],
      secondaryKeys: ["fire"],
      comment: "Dragon lore",
      content: "@@depth 4\nDragons breathe fire.",
      constant: false,
      selective: true,
      selectiveLogic: 3,
      insertionOrder: 42,
      position: "before_char",
      rawPosition: "0",
      priority: 8,
      enabled: true,
      caseSensitive: true,
      wholeWords: true,
      order: 0,
      extensions: { probability: 100 },
      unknownFields: {
        use_regex: true,
        cooldown: 3,
        delay: 1,
        group: "lore",
      },
    },
  ],
}

describe("lorebook editor round-trip", () => {
  it("preserves book settings, unknown fields and entry metadata after an edit", () => {
    const editor = lorebookToEditorValue(lorebook)
    editor.entries[0].content = "Dragons breathe fire."

    const payload = JSON.parse(serializeLorebook(editor)) as {
      data: Record<string, unknown>
    }
    const data = payload.data
    const entry = (data.entries as Array<Record<string, unknown>>)[0]

    expect(data.scan_depth).toBe(8)
    expect(data.token_budget).toBe(900)
    expect(data.recursive_scanning).toBe(true)
    expect(data.extensions).toEqual({ source: "import" })
    expect(data.book_custom).toEqual({ keep: true })

    expect(entry.id).toBe("7")
    expect(entry.position).toBe(0)
    expect(entry.use_regex).toBe(true)
    expect(entry.cooldown).toBe(3)
    expect(entry.delay).toBe(1)
    expect(entry.group).toBe("lore")
    expect(entry.extensions).toEqual({ probability: 100 })
  })
})
