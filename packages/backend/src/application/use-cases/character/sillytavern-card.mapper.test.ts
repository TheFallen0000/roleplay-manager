import { describe, expect, it } from "vitest"

import { translate } from "@workspace/shared/i18n"
import {
  detectSillyTavernShape,
  MAX_LOREBOOK_ENTRIES,
  MAX_PROMPT_FIELD_CHARS,
  projectCardToV2,
  validateCardFieldSize,
} from "@workspace/shared/lib/sillytavern-card"

import {
  buildCardWithUnknownFields,
  buildLorebookCCv3,
  buildLorebookStNativeArray,
  buildLorebookStNativeObject,
  buildV1Card,
  buildV2Card,
  buildV3Card,
} from "../../../test-utils/sillytavern-fixtures"
import {
  cardDataToVersionFields,
  readRmExtensions,
  versionFieldsToCardData,
  withRmExtensions,
} from "./sillytavern-card.mapper"

const asRecord = (value: unknown): Record<string, unknown> =>
  value as Record<string, unknown>

const capture = (callback: () => unknown): { code?: string } | null => {
  try {
    callback()
    return null
  } catch (error) {
    return error as { code?: string }
  }
}

describe("shared card limits", () => {
  it("caps lorebook imports at 1000 entries", () => {
    expect(MAX_LOREBOOK_ENTRIES).toBe(1_000)
  })
})

describe("detectSillyTavernShape", () => {
  it("detects a flat V1 card", () => {
    expect(detectSillyTavernShape(buildV1Card())).toEqual({ shape: "v1" })
  })

  it("detects V2 and V3 envelopes", () => {
    expect(detectSillyTavernShape(buildV2Card())).toEqual({
      shape: "card",
      spec: "chara_card_v2",
    })
    expect(detectSillyTavernShape(buildV3Card())).toEqual({
      shape: "card",
      spec: "chara_card_v3",
    })
  })

  it("detects a standalone CCv3 lorebook", () => {
    expect(detectSillyTavernShape(buildLorebookCCv3())).toEqual({
      shape: "lorebook_ccv3",
    })
  })

  it("detects ST native lorebooks as object and array", () => {
    expect(detectSillyTavernShape(buildLorebookStNativeObject())).toEqual({
      shape: "lorebook_st_native",
      container: "object",
    })
    expect(detectSillyTavernShape(buildLorebookStNativeArray())).toEqual({
      shape: "lorebook_st_native",
      container: "array",
    })
  })

  it("reports unknown roots", () => {
    expect(detectSillyTavernShape({ hello: "world" })).toEqual({
      shape: "unknown",
    })
  })
})

describe("cardDataToVersionFields — V1/V2/V3 mapping", () => {
  it("maps a V1 card and keeps unknown root keys separate", () => {
    const fields = asRecord(
      cardDataToVersionFields(
        buildV1Card({ custom_root: { nested: true } }),
        { custom_root: { nested: true } }
      )
    )

    expect(fields.name).toBe("Lyra")
    expect(fields.description).toBe("A guardian of the forest.")
    expect(fields.personality).toBe("Brave and kind.")
    expect(fields.scenario).toBe("An ancient forest.")
    expect(fields.greeting).toBe("Hello, traveler.")
    expect(fields.mesExample).toBe("<START>\n{{char}}: Welcome.")
    expect(fields.unknownRootFields).toEqual({ custom_root: { nested: true } })
    expect(fields.alternateGreetings).toEqual([])
    expect(fields.extensions).toBeNull()
  })

  it("maps the V2 card fields to entity fields", () => {
    const fields = asRecord(cardDataToVersionFields(buildV2Card().data))

    expect(fields).toMatchObject({
      name: "Lyra",
      description: "A guardian of the forest.",
      personality: "Brave and kind.",
      scenario: "An ancient forest.",
      greeting: "Hello, traveler.",
      mesExample: "<START>\n{{char}}: Welcome.",
      systemPrompt: "You are Lyra.",
      postHistoryInstructions: "Stay in character.",
      alternateGreetings: ["Greetings, traveler."],
      creatorNotes: "Never sent to the model.",
      tags: ["fantasy", "guardian"],
      creator: "Card Author",
      cardCharacterVersion: "1.2.0",
    })
    expect(fields.extensions).toEqual({ rm: { tagline: "The forest's guardian" } })
  })

  it("puts unknown data keys in unknownFields, not extensions", () => {
    const card = buildCardWithUnknownFields()
    const fields = asRecord(cardDataToVersionFields(card.data))

    expect(fields.extensions).toEqual({
      rm: { tagline: "The forest's guardian" },
    })
    expect(fields.unknownFields).toMatchObject({
      assets: [{ type: "icon", uri: "ccdefault:", name: "main", ext: "png" }],
      nickname: "The Guardian",
      group_only_greetings: ["Group hello"],
      creator_notes_multilingual: { es: "Notas del creador" },
      source: ["https://example.test/card"],
      creation_date: 1_700_000_000,
      modification_date: 1_700_000_001,
    })
    expect(fields.unknownFields).not.toHaveProperty("extensions")
  })

  it("maps numeric ST positions to before/after and keeps raw_position", () => {
    const data = buildV3Card({
      character_book: buildLorebookCCv3([
        { keys: ["a"], content: "A", position: 0 },
        { keys: ["b"], content: "B", position: 1 },
        { keys: ["c"], content: "C", position: 2 },
        { keys: ["d"], content: "D", position: 3 },
        { keys: ["e"], content: "E", position: 4 },
        { keys: ["f"], content: "F", position: 5 },
        { keys: ["g"], content: "G", position: 6 },
      ]).data,
    }).data

    const fields = asRecord(cardDataToVersionFields(data))
    const lorebook = asRecord(fields.lorebook)
    const entries = lorebook.entries as Array<Record<string, unknown>>

    expect(entries.map((item) => item.position)).toEqual([
      "before_char",
      "after_char",
      "after_char",
      "after_char",
      "after_char",
      "before_char",
      "after_char",
    ])
    expect(entries.map((item) => item.rawPosition)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ])
  })

  it("maps ST native aliases to the normalized entry shape", () => {
    const data = buildLorebookStNativeArray([
      {
        uid: 7,
        key: ["dragon", "wyrm"],
        keysecondary: ["fire"],
        comment: "Dragon lore",
        content: "Dragons breathe fire.",
        constant: false,
        selective: true,
        selectiveLogic: 3,
        order: 42,
        position: 0,
        disable: true,
        caseSensitive: true,
        matchWholeWords: true,
        priority: 8,
        useRegex: true,
        probability: 100,
      },
    ])
    const fields = asRecord(cardDataToVersionFields(data))
    const lorebook = asRecord(fields.lorebook)
    const entry = (lorebook.entries as Array<Record<string, unknown>>)[0]

    expect(entry).toMatchObject({
      sourceId: "7",
      keys: ["dragon", "wyrm"],
      secondaryKeys: ["fire"],
      comment: "Dragon lore",
      content: "Dragons breathe fire.",
      selective: true,
      selectiveLogic: 3,
      insertionOrder: 42,
      position: "before_char",
      rawPosition: "0",
      enabled: false,
      caseSensitive: true,
      wholeWords: true,
      priority: 8,
    })
    expect(entry.unknownFields).toMatchObject({ useRegex: true, probability: 100 })
  })
})

describe("cardDataToVersionFields — empty fields policy", () => {
  it("rejects an empty or whitespace name", () => {
    expect(capture(() => cardDataToVersionFields(buildV2Card({ name: "" }).data)))
      .toMatchObject({ code: "INVALID_CARD_NAME" })
    expect(
      capture(() => cardDataToVersionFields(buildV1Card({ name: "   " })))
    ).toMatchObject({ code: "INVALID_CARD_NAME" })
  })

  it("uses the localized default description and warns", () => {
    const fields = asRecord(
      cardDataToVersionFields(buildV2Card({ description: "   " }).data)
    )

    expect(fields.description).toBe(
      translate("en", "characters.cardFallbackDescription")
    )
    expect(fields.warnings).toContain("EMPTY_DESCRIPTION")
  })

  it("uses alternate_greetings[0] when first_mes is empty and removes it", () => {
    const fields = asRecord(
      cardDataToVersionFields(
        buildV2Card({
          first_mes: "  ",
          alternate_greetings: ["First alternative", "Second alternative"],
        }).data
      )
    )

    expect(fields.greeting).toBe("First alternative")
    expect(fields.alternateGreetings).toEqual(["Second alternative"])
    expect(fields.warnings).not.toContain("EMPTY_GREETING")
  })

  it("uses the localized default greeting when there is no alternative", () => {
    const fields = asRecord(
      cardDataToVersionFields(
        buildV2Card({ first_mes: "", alternate_greetings: [] }).data
      )
    )

    expect(fields.greeting).toBe(
      translate("en", "characters.cardFallbackGreeting")
    )
    expect(fields.alternateGreetings).toEqual([])
    expect(fields.warnings).toContain("EMPTY_GREETING")
  })
})

describe("projectCardToV2", () => {
  it("removes V3-only data keys and preserves extensions verbatim", () => {
    const data = asRecord(buildCardWithUnknownFields().data)
    const projected = asRecord(projectCardToV2(data))

    for (const key of [
      "assets",
      "nickname",
      "group_only_greetings",
      "creator_notes_multilingual",
      "source",
      "creation_date",
      "modification_date",
    ]) {
      expect(projected).not.toHaveProperty(key)
    }
    expect(projected.extensions).toEqual(data.extensions)
    expect(projected).toHaveProperty("name", "Lyra")
  })

  it("removes V3-only entry fields but keeps a valid V2 character_book", () => {
    const data = asRecord(buildCardWithUnknownFields().data)
    const projected = asRecord(projectCardToV2(data))
    const book = asRecord(projected.character_book)
    const entry = (book.entries as Array<Record<string, unknown>>)[0]

    for (const key of [
      "probability",
      "group",
      "group_override",
      "group_weight",
      "vectorized",
      "use_regex",
      "cooldown",
      "delay",
      "sticky",
      "delay_until_recursion",
    ]) {
      expect(entry).not.toHaveProperty(key)
    }
    expect(entry).toHaveProperty("content")
    expect(entry.extensions).toEqual({ probability: 100, group: "lore" })
  })
})

describe("validateCardFieldSize", () => {
  it("rejects a prompt field over MAX_PROMPT_FIELD_CHARS naming the field", () => {
    const result = validateCardFieldSize({
      name: "Lyra",
      system_prompt: "x".repeat(MAX_PROMPT_FIELD_CHARS + 1),
    })

    expect(result).toEqual({ ok: false, field: "system_prompt" })
  })

  it.each([
    "description",
    "personality",
    "scenario",
    "mes_example",
    "system_prompt",
    "post_history_instructions",
  ])("applies the cap to %s", (field) => {
    const result = validateCardFieldSize({
      name: "Lyra",
      [field]: "x".repeat(MAX_PROMPT_FIELD_CHARS + 1),
    })

    expect(result).toEqual({ ok: false, field })
  })

  it("accepts fields exactly at the cap", () => {
    expect(
      validateCardFieldSize({
        name: "Lyra",
        system_prompt: "x".repeat(MAX_PROMPT_FIELD_CHARS),
      })
    ).toEqual({ ok: true })
  })
})

describe("versionFieldsToCardData", () => {
  const version = {
    name: "Lyra",
    description: "A guardian of the forest.",
    personality: "Brave and kind.",
    scenario: "An ancient forest.",
    greeting: "Hello, traveler.",
    mesExample: "<START>\n{{char}}: Welcome.",
    systemPrompt: "You are Lyra.",
    postHistoryInstructions: "Stay in character.",
    alternateGreetings: ["Greetings, traveler."],
    creatorNotes: "Never sent to the model.",
    tags: ["fantasy", "guardian"],
    creator: "Card Author",
    cardCharacterVersion: "1.2.0",
    gender: "female",
    pronouns: "she/her",
    tagline: "The forest's guardian",
    extensions: { rm: { other: 1 } },
    unknownFields: { assets: [{ type: "icon" }], nickname: "The Guardian" },
    unknownRootFields: { custom_root_key: true },
  }

  const lorebook = {
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    extensions: { source: "import" },
    unknownFields: null,
    entries: [
      {
        id: "entry-1",
        name: "Dragon lore",
        sourceId: "7",
        keys: ["dragon"],
        secondaryKeys: ["fire"],
        comment: "Dragon lore",
        content: "Dragons breathe fire.",
        constant: false,
        selective: true,
        selectiveLogic: 3 as const,
        insertionOrder: 42,
        position: "before_char" as const,
        rawPosition: "0",
        priority: 8,
        enabled: true,
        caseSensitive: true,
        wholeWords: true,
        order: 0,
        extensions: { probability: 100 },
        unknownFields: { useRegex: true },
      },
    ],
  }

  it("maps entity fields back to the ST card data keys", () => {
    const data = asRecord(versionFieldsToCardData(version as never, lorebook as never))

    expect(data).toMatchObject({
      name: "Lyra",
      description: "A guardian of the forest.",
      personality: "Brave and kind.",
      scenario: "An ancient forest.",
      first_mes: "Hello, traveler.",
      mes_example: "<START>\n{{char}}: Welcome.",
      system_prompt: "You are Lyra.",
      post_history_instructions: "Stay in character.",
      alternate_greetings: ["Greetings, traveler."],
      creator_notes: "Never sent to the model.",
      tags: ["fantasy", "guardian"],
      creator: "Card Author",
      character_version: "1.2.0",
      gender: "female",
      pronouns: "she/her",
      assets: [{ type: "icon" }],
      nickname: "The Guardian",
    })
    expect(asRecord(data.extensions)).toMatchObject({
      rm: { other: 1, tagline: "The forest's guardian" },
    })
  })

  it("re-emits the lorebook and per-entry unknown fields", () => {
    const data = asRecord(versionFieldsToCardData(version as never, lorebook as never))
    const book = asRecord(data.character_book)
    const entry = (book.entries as Array<Record<string, unknown>>)[0]

    expect(book).toMatchObject({
      name: "Forest lore",
      description: "Facts about the forest",
      scan_depth: 4,
      token_budget: 400,
      recursive_scanning: false,
    })
    expect(entry).toMatchObject({
      keys: ["dragon"],
      secondary_keys: ["fire"],
      comment: "Dragon lore",
      content: "Dragons breathe fire.",
      selective: true,
      selectiveLogic: 3,
      insertion_order: 42,
      priority: 8,
      enabled: true,
      case_sensitive: true,
      whole_words: true,
    })
    expect(String(entry.position)).toBe("0")
    expect(asRecord(entry.extensions)).toEqual({ probability: 100 })
    expect(entry.useRegex).toBe(true)
  })
})

describe("RmExtensions merge", () => {
  const rm = {
    version: 1,
    subtitle: "Guardian of the grove",
    instructions: "Speak in riddles.",
    knowledgeCards: [
      { title: "Oath", content: "Protect the forest.", position: 0, active: true },
    ],
    versionNumber: 3,
    tagline: "The forest's guardian",
    lorebook: {
      lorebookId: "book-1",
      lorebookVersionId: "version-1",
      versionNumber: 2,
      sourceKey: "a".repeat(64),
      originId: "origin-1",
    },
  }

  it("sets known RM keys while preserving other namespaces and unknown RM keys", () => {
    const merged = asRecord(
      withRmExtensions(
        { rm: { tagline: "Old", futureRmKey: { keep: true } }, other: { x: 1 } },
        rm,
      ),
    )

    expect(merged.other).toEqual({ x: 1 })
    expect(asRecord(merged.rm)).toMatchObject({
      ...rm,
      futureRmKey: { keep: true },
    })
    expect(asRecord(merged.rm).version).toBe(1)
  })

  it("reads only the known RM keys", () => {
    const read = readRmExtensions({
      rm: { ...rm, futureRmKey: { keep: true } },
      other: { x: 1 },
    })

    expect(read).toEqual(rm)
    expect(read).not.toHaveProperty("futureRmKey")
  })
})

describe("card round-trip with extensions.rm (field loss = 0)", () => {
  const version = {
    name: "Lyra",
    description: "A guardian of the forest.",
    personality: "Brave and kind.",
    scenario: "An ancient forest.",
    greeting: "Hello, traveler.",
    mesExample: "<START>\n{{char}}: Welcome.",
    systemPrompt: "You are Lyra.",
    postHistoryInstructions: "Stay in character.",
    alternateGreetings: ["Greetings, traveler."],
    creatorNotes: "Never sent to the model.",
    tags: ["fantasy", "guardian"],
    creator: "Card Author",
    cardCharacterVersion: "1.2.0",
    gender: "female",
    pronouns: "she/her",
    subtitle: "Guardian of the grove",
    instructions: "Speak in riddles.",
    cards: [
      { title: "Oath", content: "Protect the forest.", position: 0, active: true },
    ],
    versionNumber: 3,
    tagline: "The forest's guardian",
    // Only the unknown RM key lives in the stored extensions; the known RM
    // fields come from the version columns.
    extensions: { other: { keep: true }, rm: { futureRmKey: { keep: true } } },
    unknownFields: {
      assets: [{ type: "icon", uri: "ccdefault:", name: "main", ext: "png" }],
      nickname: "The Guardian",
    },
  }

  const lorebook = {
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    extensions: {},
    unknownFields: null,
    entries: [
      {
        id: "entry-1",
        name: "Dragon lore",
        sourceId: "1",
        keys: ["dragon"],
        secondaryKeys: [],
        comment: "Dragon lore",
        content: "@@depth 4\nDragons dwell in the northern mountains.",
        constant: false,
        selective: false,
        selectiveLogic: 0 as const,
        insertionOrder: 100,
        position: "after_char" as const,
        rawPosition: "1",
        priority: 0,
        enabled: true,
        caseSensitive: false,
        wholeWords: false,
        order: 0,
        extensions: {},
        unknownFields: null,
      },
    ],
  }

  it("re-emits every RM field from the version and preserves unknown keys", () => {
    const exported = versionFieldsToCardData(version as never, lorebook as never)

    expect(exported).toMatchObject({
      name: "Lyra",
      description: "A guardian of the forest.",
      first_mes: "Hello, traveler.",
      assets: version.unknownFields.assets,
      nickname: version.unknownFields.nickname,
    })
    const extensions = asRecord(exported.extensions)
    expect(extensions.other).toEqual({ keep: true })
    expect(asRecord(extensions.rm)).toMatchObject({
      version: 1,
      subtitle: "Guardian of the grove",
      instructions: "Speak in riddles.",
      knowledgeCards: [
        { title: "Oath", content: "Protect the forest.", position: 0, active: true },
      ],
      versionNumber: 3,
      tagline: "The forest's guardian",
      futureRmKey: { keep: true },
    })

    const book = asRecord(exported.character_book)
    const entry = (book.entries as Array<Record<string, unknown>>)[0]
    expect(book).toMatchObject({
      name: "Forest lore",
      scan_depth: 4,
      token_budget: 400,
    })
    expect(entry).toMatchObject({
      keys: ["dragon"],
      content: "@@depth 4\nDragons dwell in the northern mountains.",
    })
  })
})
