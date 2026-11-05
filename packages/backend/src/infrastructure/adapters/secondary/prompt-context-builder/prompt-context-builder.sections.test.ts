import { describe, it, expect } from "vitest"

import { estimateTextTokens } from "@workspace/shared/lib/token-estimate"

import { CharacterCard } from "../../../../domain/entities/character-card.entity"
import { CharacterVersion } from "../../../../domain/entities/character-version.entity"
import { Memory } from "../../../../domain/entities/memory.entity"
import { Message } from "../../../../domain/entities/message.entity"
import { Summary } from "../../../../domain/entities/summary.entity"
import { PromptContextBuilderImpl } from "./prompt-context-builder.impl"

const now = new Date("2026-11-05T12:00:00.000Z")

const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Test Character",
  subtitle: "The keeper",
  profileImageAssetId: null,
  description: "A mysterious character.",
  instructions: "Stay in character at all times.",
  greeting: "Hello, traveller!",
  versionNumber: 1,
  createdAt: now,
  cards: [
    CharacterCard.create({
      id: "card-1",
      versionId: "ver-1",
      title: "Historia",
      content: "Grew up in the mountains.",
      position: 0,
      active: true,
    }),
    CharacterCard.create({
      id: "card-2",
      versionId: "ver-1",
      title: "Personalidad",
      content: "Reserved but kind.",
      position: 1,
      active: true,
    }),
  ],
})

const memories = [
  Memory.reconstruct({
    id: "mem-1",
    conversationId: "conv-1",
    actor: "Test Character",
    title: "Likes tea",
    description: "Drinks tea every evening.",
    priority: 7,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  }),
  Memory.reconstruct({
    id: "mem-2",
    conversationId: "conv-1",
    actor: "Alice",
    title: "Fears heights",
    description: "Avoids balconies.",
    priority: 5,
    createdBy: "user",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  }),
]

const summary = Summary.reconstruct({
  id: "sum-1",
  conversationId: "conv-1",
  content: "They met at the tavern and set off together.",
  firstMessageId: "msg-1",
  lastMessageId: "msg-3",
  model: "llama3",
  provider: "ollama",
  createdAt: now,
  editedAt: null,
})

const messages = [
  Message.create({
    id: "msg-4",
    conversationId: "conv-1",
    role: "assistant",
    content: "We leave at dawn.",
    position: 4,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  }),
  Message.create({
    id: "msg-5",
    conversationId: "conv-1",
    role: "user",
    content: "I pack my things // remember the map //",
    position: 5,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  }),
]

const params = {
  characterVersion: version,
  messages,
  recentMessageCount: messages.length,
  memories,
  summary,
  playerCharacter: { name: "Alice", description: "A curious explorer." },
  locale: "es" as const,
  enableMemoryProposalTool: true,
  filterOocFromHistory: true,
}

const EXPECTED_SECTION_IDS = [
  "character",
  "cards",
  "player",
  "memories",
  "summary",
  "ooc",
]

describe("PromptContextBuilderImpl.buildWithSections", () => {
  it("returns the same PromptContext as build for the same inputs", async () => {
    const builder = new PromptContextBuilderImpl()
    const context = await builder.build(params)
    const { context: sectionedContext } =
      await builder.buildWithSections(params)

    expect(sectionedContext.systemPrompt).toBe(context.systemPrompt)
    expect(sectionedContext.messages).toEqual(context.messages)
  })

  it("concatenates section contents to exactly the built systemPrompt", async () => {
    const builder = new PromptContextBuilderImpl()
    const { context, sections } = await builder.buildWithSections(params)

    expect(sections.length).toBeGreaterThan(0)
    expect(sections.map((section) => section.content).join("\n")).toBe(
      context.systemPrompt
    )
  })

  it("exposes the expected section ids", async () => {
    const builder = new PromptContextBuilderImpl()
    const { sections } = await builder.buildWithSections(params)

    const ids = sections.map((section) => section.id)
    for (const expected of EXPECTED_SECTION_IDS) {
      expect(ids).toContain(expected)
    }
  })

  it("marks every section as system source with a reason and positive tokens", async () => {
    const builder = new PromptContextBuilderImpl()
    const { sections } = await builder.buildWithSections(params)

    for (const section of sections) {
      expect(section.source).toBe("system")
      expect(typeof section.reason).toBe("string")
      expect(section.reason.length).toBeGreaterThan(0)
    }

    for (const expected of EXPECTED_SECTION_IDS) {
      const section = sections.find((candidate) => candidate.id === expected)
      expect(section, `missing section "${expected}"`).toBeDefined()
      expect(estimateTextTokens(section!.content)).toBeGreaterThan(0)
    }
  })

  it("keeps the section order stable (character < cards < player < memories < summary < ooc)", async () => {
    const builder = new PromptContextBuilderImpl()
    const { sections } = await builder.buildWithSections(params)
    const ids = sections.map((section) => section.id)

    const indexOf = (id: string) => ids.indexOf(id)
    for (let i = 1; i < EXPECTED_SECTION_IDS.length; i += 1) {
      expect(indexOf(EXPECTED_SECTION_IDS[i - 1])).toBeLessThan(
        indexOf(EXPECTED_SECTION_IDS[i])
      )
    }
  })
})
