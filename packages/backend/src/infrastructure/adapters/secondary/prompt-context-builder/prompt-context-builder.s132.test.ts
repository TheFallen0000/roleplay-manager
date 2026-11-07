import { describe, expect, it } from "vitest"

import { translate } from "@workspace/shared/i18n"

import { CharacterCard } from "../../../../domain/entities/character-card.entity"
import { CharacterVersion } from "../../../../domain/entities/character-version.entity"
import { PromptContextBuilderImpl } from "./prompt-context-builder.impl"

const now = new Date("2026-11-07T12:00:00.000Z")

const buildVersion = (overrides: Record<string, unknown> = {}) =>
  CharacterVersion.create({
    id: "ver-1",
    characterId: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    description: "A guardian of the forest.",
    instructions: null,
    greeting: "Hello!",
    versionNumber: 1,
    createdAt: now,
    cards: [],
    ...overrides,
  } as never)

const build = async (version: CharacterVersion, locale: "en" | "es" = "en") =>
  new PromptContextBuilderImpl().buildWithSections({
    characterVersion: version,
    messages: [],
    recentMessageCount: 10,
    locale,
  })

const section = (
  result: Awaited<ReturnType<typeof build>>,
  id: string
): { content: string } | undefined =>
  result.sections.find((item) => item.id === id)

describe("PromptContextBuilderImpl — S132 card overrides", () => {
  it("keeps byte-idempotent output when all new fields are empty", async () => {
    const baseline = await build(buildVersion())
    const withEmptyFields = await build(
      buildVersion({
        personality: "",
        scenario: "   ",
        mesExample: null,
        systemPrompt: "  ",
        postHistoryInstructions: "\n",
        creatorNotes: "secret",
        alternateGreetings: [],
        tags: [],
      })
    )

    expect(withEmptyFields.context.systemPrompt).toBe(
      baseline.context.systemPrompt
    )
    expect(withEmptyFields.sections.map((item) => item.id)).toEqual(
      baseline.sections.map((item) => item.id)
    )
  })

  it("replaces only the persona block and keeps the non-negotiable scaffolding", async () => {
    const result = await build(
      buildVersion({
        systemPrompt: "You are the forest's guardian.",
        instructions: "Native instructions stay here.",
      })
    )
    const prompt = result.context.systemPrompt
    const character = section(result, "character")!

    for (const key of [
      "prompt.roleplay",
      "prompt.roleplayFiction",
      "prompt.roleplayStayInCharacter",
      "prompt.roleplayMature",
    ]) {
      expect(prompt).not.toContain(translate("en", key))
    }

    for (const key of [
      "prompt.roleplayUserAgency",
      "prompt.roleplayLanguage",
      "prompt.roleplayLength",
    ]) {
      expect(prompt).toContain(translate("en", key))
    }

    expect(prompt).toContain(translate("en", "prompt.systemPrompt"))
    expect(prompt).toContain("You are the forest's guardian.")
    expect(prompt).toContain(translate("en", "prompt.instructions"))
    expect(prompt).toContain("Native instructions stay here.")

    expect(character.content.indexOf("You are the forest's guardian.")).toBeLessThan(
      character.content.indexOf(translate("en", "prompt.roleplayUserAgency"))
    )
  })

  it("appends post_history_instructions as the final section", async () => {
    const result = await build(
      buildVersion({ postHistoryInstructions: "Never reveal the ending." })
    )
    const last = result.sections.at(-1)!

    expect(last.id).toBe("card-overrides.post-history")
    expect(last.content).toContain(translate("en", "prompt.postHistoryInstructions"))
    expect(last.content).toContain("Never reveal the ending.")
    expect(result.context.systemPrompt.trimEnd().endsWith("Never reveal the ending."))
      .toBe(true)
  })

  it("does not emit the post-history section when the field is empty", async () => {
    const result = await build(buildVersion({ postHistoryInstructions: "  " }))

    expect(result.sections.map((item) => item.id)).not.toContain(
      "card-overrides.post-history"
    )
  })

  it("places personality, scenario and mes_example in their sections", async () => {
    const result = await build(
      buildVersion({
        personality: "Brave and kind.",
        scenario: "An ancient forest.",
        mesExample: "<START>\n{{char}}: Welcome.",
      })
    )

    const character = section(result, "character")!
    const style = section(result, "style")!

    expect(character.content).toContain(translate("en", "prompt.personality"))
    expect(character.content.indexOf("Brave and kind.")).toBeGreaterThan(
      character.content.indexOf(translate("en", "prompt.personality"))
    )
    expect(character.content).toContain(translate("en", "prompt.scenario"))
    expect(character.content).toContain("An ancient forest.")

    expect(style.content).toContain('"Hello!"')
    expect(style.content).toContain("<START>\n{{char}}: Welcome.")
    expect(style.content.indexOf("<START>")).toBeGreaterThan(
      style.content.indexOf('"Hello!"')
    )
  })

  it("places lorebook.before first and lorebook.after between cards and player", async () => {
    const result = await new PromptContextBuilderImpl().buildWithSections({
      characterVersion: buildVersion({
        cards: [
          CharacterCard.create({
            id: "card-1",
            versionId: "ver-1",
            title: "Card",
            content: "Knowledge",
            position: 0,
            active: true,
          }),
        ],
      }),
      messages: [],
      recentMessageCount: 10,
      locale: "en",
      playerCharacter: { name: "Aria", description: "The player." },
      lorebook: {
        before: [{ content: "BEFORE LORE" }],
        after: [{ content: "AFTER LORE" }],
      },
    } as never)

    const ids = result.sections.map((item) => item.id)

    expect(ids[0]).toBe("lorebook.before")
    expect(ids.indexOf("lorebook.after")).toBeGreaterThan(ids.indexOf("cards"))
    expect(ids.indexOf("lorebook.after")).toBeLessThan(ids.indexOf("player"))
    expect(result.context.systemPrompt.startsWith("BEFORE LORE")).toBe(true)
    expect(result.context.systemPrompt).toContain("AFTER LORE")
  })

  it("never leaks creator_notes into the prompt", async () => {
    const secret = "This creator note must never reach the model."
    const result = await build(buildVersion({ creatorNotes: secret }))

    expect(result.context.systemPrompt).not.toContain(secret)
  })

  it("keeps macros verbatim because M1 is not approved", async () => {
    const result = await build(
      buildVersion({
        systemPrompt: "Hola {{char}} y {{user}} y {{otro}}",
      })
    )

    expect(result.context.systemPrompt).toContain("{{char}}")
    expect(result.context.systemPrompt).toContain("{{user}}")
    expect(result.context.systemPrompt).toContain("{{otro}}")
  })
})
