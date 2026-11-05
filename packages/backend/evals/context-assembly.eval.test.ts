import { describe, it, expect } from "vitest"

import {
  estimateContextTokens,
  estimateMessagesTokens,
  estimateTextTokens,
} from "@workspace/shared/lib/token-estimate"
import type { Locale } from "@workspace/shared/i18n"

import { Character } from "../src/domain/entities/character.entity"
import { CharacterVersion } from "../src/domain/entities/character-version.entity"
import { Conversation } from "../src/domain/entities/conversation.entity"
import { Memory } from "../src/domain/entities/memory.entity"
import { Message } from "../src/domain/entities/message.entity"
import { Summary } from "../src/domain/entities/summary.entity"
import type { CharacterRepository } from "../src/domain/ports/character.repository"
import type { ConversationRepository } from "../src/domain/ports/conversation.repository"
import type { MemoryRepository } from "../src/domain/ports/memory.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../src/domain/ports/message.repository"
import type { PlayerCharacterRepository } from "../src/domain/ports/player-character.repository"
import type { SummaryRepository } from "../src/domain/ports/summary.repository"
import { buildMessageHistoryRepository } from "../src/test-utils/message-history"
import { PromptContextBuilderImpl } from "../src/infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl"
import { ConversationContextLoader } from "../src/application/services/conversation-context-loader.service"
import { ContextCompiler } from "../src/application/services/context-compiler.service"

const now = new Date("2026-11-05T12:00:00.000Z")

interface Fixture {
  name: string
  conversation: Conversation
  characterVersion: CharacterVersion
  character: Character
  messages: Message[]
  summary: Summary | null
  memories: Memory[]
  pendingMessages?: Message[]
  excludeMessageId?: string
  locale: Locale
  expected: {
    sectionIds: string[]
    memoriesIncluded: string[]
    memoriesExcluded: string[]
    afterSummary: number
    pending: number
    excluded: number
    total: number
    needed: boolean
  }
}

const mkCharacter = (): Character =>
  Character.create({
    id: "char-1",
    name: "Test Character",
    createdAt: now,
    updatedAt: now,
  })

const mkVersion = (): CharacterVersion =>
  CharacterVersion.create({
    id: "ver-1",
    characterId: "char-1",
    name: "Test Character",
    subtitle: null,
    profileImageAssetId: null,
    description: "A mysterious character.",
    instructions: null,
    greeting: "Hello!",
    versionNumber: 1,
    createdAt: now,
    cards: [],
  })

const mkConversation = (
  overrides: {
    contextWindow?: number | null
    compactionThreshold?: number
    memoryDecayMode?: "silent" | "manual" | "off"
    memoryDecayThreshold?: number
    memoryDecaySpeed?: number
  } = {}
): Conversation =>
  Conversation.create({
    id: "conv-1",
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: "llama3",
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 20,
    summaryFrequency: 20,
    contextWindow:
      "contextWindow" in overrides ? overrides.contextWindow : 8_000,
    compactionThreshold:
      "compactionThreshold" in overrides ? overrides.compactionThreshold : 80,
    temperature: 0.7,
    maxTokens: 2_048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    memoryDecayMode: overrides.memoryDecayMode,
    memoryDecayThreshold: overrides.memoryDecayThreshold,
    memoryDecaySpeed: overrides.memoryDecaySpeed,
    createdAt: now,
    updatedAt: now,
  })

const mkMessage = (
  id: string,
  role: "user" | "assistant",
  content: string,
  position: number,
  createdAt: Date = now
): Message =>
  Message.create({
    id,
    conversationId: "conv-1",
    role,
    content,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt,
    editedAt: null,
  })

const mkMemory = (
  id: string,
  priority: number,
  updatedAt: Date = now
): Memory =>
  Memory.reconstruct({
    id,
    conversationId: "conv-1",
    actor: "Test Character",
    title: `Memory ${id}`,
    description: `Description of ${id}.`,
    priority,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt,
  })

const mkSummary = (lastMessageId: string): Summary =>
  Summary.reconstruct({
    id: "sum-1",
    conversationId: "conv-1",
    content: "Summary of the early conversation.",
    firstMessageId: "msg-0",
    lastMessageId,
    model: "llama3",
    provider: "ollama",
    createdAt: now,
    editedAt: null,
  })

interface Repos {
  conversationRepository: ConversationRepository
  characterRepository: CharacterRepository
  messageHistoryRepository: MessageHistoryRepository
  messageRepository: MessageRepository
  memoryRepository: MemoryRepository
  summaryRepository: SummaryRepository
  playerCharacterRepository: PlayerCharacterRepository
}

const buildRepos = (fixture: Fixture): Repos => {
  const byId = new Map(fixture.messages.map((m) => [m.id, m]))
  const findPositionById = async (id: string) => {
    const message = byId.get(id)
    return message ? message.position : null
  }

  return {
    conversationRepository: {
      create: async (c) => c,
      findById: async () => fixture.conversation,
      list: async () => [],
      listByCharacterId: async () => [],
      listByCharacterIds: async () => [],
      existsByAssetId: async () => false,
      update: async (c) => c,
      updateSettings: async (_id, _s) => fixture.conversation,
      clearProviderInstanceId: async () => {},
    },
    characterRepository: {
      createWithFirstVersion: async () => ({
        character: fixture.character,
        version: fixture.characterVersion,
      }),
      findById: async () => ({
        character: fixture.character,
        currentVersion: fixture.characterVersion,
      }),
      list: async () => [],
      update: async (c) => c,
      delete: async () => {},
      findVersionById: async () => fixture.characterVersion,
      findVersionsByCharacterId: async () => [],
      findMaxVersionNumber: async () => 0,
      saveVersion: async (v) => v,
      updateProfileImageAssetId: async () => {},
    },
    messageHistoryRepository: buildMessageHistoryRepository(
      () => fixture.messages,
      findPositionById
    ),
    messageRepository: {
      create: async (m) => m,
      findByConversationId: async () => fixture.messages,
      findById: async (id) => byId.get(id) ?? null,
      findLastByConversationId: async () => fixture.messages.at(-1) ?? null,
      update: async (m) => m,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    },
    memoryRepository: {
      findById: async () => null,
      findByConversationId: async () => fixture.memories,
      create: async (m) => m,
      update: async (m) => m,
      deleteById: async () => {},
    },
    summaryRepository: {
      findById: async () => fixture.summary,
      findByConversationId: async () =>
        fixture.summary ? [fixture.summary] : [],
      findLatestByConversationId: async () => fixture.summary,
      create: async (s) => s,
      update: async (s) => s,
      deleteById: async () => {},
      deleteByIds: async () => {},
    },
    playerCharacterRepository: {
      findById: async () => null,
      list: async () => [],
      create: async (pc) => pc,
      update: async (pc) => pc,
      delete: async () => {},
    },
  }
}

const computeNeeded = (
  conversation: Conversation,
  reference: { systemPrompt: string; messages: { content: string }[] }
): boolean => {
  const window = conversation.contextWindow
  if (!window || window <= 0) return false
  const estimate = estimateContextTokens({
    systemPrompt: reference.systemPrompt,
    messages: reference.messages,
    outputReserve: conversation.maxTokens ?? 2_048,
    contextWindow: window,
  })
  return (
    estimate.totalTokens >= window * (conversation.compactionThreshold / 100)
  )
}

const assemble = async (fixture: Fixture) => {
  const repos = buildRepos(fixture)
  const builder = new PromptContextBuilderImpl()
  const loader = new ConversationContextLoader(repos as never)

  const loaded = await loader.load({
    conversationId: fixture.conversation.id,
    pendingMessages: fixture.pendingMessages,
    excludeMessageId: fixture.excludeMessageId,
  })

  const reference = await builder.build({
    characterVersion: fixture.characterVersion,
    messages: loaded.messages,
    recentMessageCount: loaded.messages.length,
    memories: loaded.promptMemories,
    summary: loaded.latestSummary ?? undefined,
    playerCharacter: loaded.playerCharacter,
    locale: fixture.locale,
    enableMemoryProposalTool: true,
    filterOocFromHistory: true,
  })

  const needed = computeNeeded(fixture.conversation, reference)

  const compiler = new ContextCompiler(builder)
  const { context, manifest } = await compiler.compile({
    conversation: fixture.conversation,
    characterVersion: fixture.characterVersion,
    messages: loaded.messages,
    pendingCount: loaded.pendingMessages.length,
    excludedCount: loaded.excludedMessageId ? 1 : 0,
    memories: loaded.memories,
    promptMemories: loaded.promptMemories,
    summary: loaded.latestSummary,
    playerCharacter: loaded.playerCharacter,
    locale: fixture.locale,
    outputReserve: fixture.conversation.maxTokens ?? 2_048,
    compaction: { needed, applied: false },
  })

  return { loaded, reference, needed, context, manifest }
}

const summaryBoundary: Fixture = {
  name: "summary boundary",
  conversation: mkConversation(),
  characterVersion: mkVersion(),
  character: mkCharacter(),
  messages: [
    mkMessage("msg-0", "user", "Opening line.", 0),
    mkMessage("msg-1", "assistant", "First reply.", 1),
    mkMessage("msg-2", "user", "Second line.", 2),
    mkMessage("msg-3", "assistant", "Second reply.", 3),
    mkMessage("msg-4", "user", "Third line.", 4),
    mkMessage("msg-5", "assistant", "Third reply.", 5),
  ],
  summary: mkSummary("msg-2"),
  memories: [],
  locale: "en",
  expected: {
    sectionIds: ["character", "summary", "history"],
    memoriesIncluded: [],
    memoriesExcluded: [],
    afterSummary: 3,
    pending: 0,
    excluded: 0,
    total: 3,
    needed: false,
  },
}

const memoryPriorityDecay: Fixture = {
  name: "memory priority/decay",
  conversation: mkConversation({
    memoryDecayMode: "silent",
    memoryDecayThreshold: 5,
    memoryDecaySpeed: 2,
  }),
  characterVersion: mkVersion(),
  character: mkCharacter(),
  messages: [
    mkMessage(
      "msg-1",
      "user",
      "Turn one.",
      1,
      new Date("2026-01-01T00:00:00.000Z")
    ),
    mkMessage(
      "msg-2",
      "assistant",
      "Reply one.",
      2,
      new Date("2026-01-02T00:00:00.000Z")
    ),
    mkMessage(
      "msg-3",
      "user",
      "Turn two.",
      3,
      new Date("2026-01-03T00:00:00.000Z")
    ),
    mkMessage(
      "msg-4",
      "assistant",
      "Reply two.",
      4,
      new Date("2026-01-04T00:00:00.000Z")
    ),
    mkMessage(
      "msg-5",
      "user",
      "Turn three.",
      5,
      new Date("2026-01-05T00:00:00.000Z")
    ),
  ],
  summary: null,
  memories: [
    mkMemory("mem-fresh-high", 9, new Date("2026-01-08T00:00:00.000Z")),
    mkMemory("mem-old-high", 10, new Date("2025-12-01T00:00:00.000Z")),
    mkMemory("mem-old-low", 6, new Date("2025-12-01T00:00:00.000Z")),
  ],
  locale: "en",
  expected: {
    sectionIds: ["character", "memories", "history"],
    memoriesIncluded: ["mem-fresh-high", "mem-old-high"],
    memoriesExcluded: ["mem-old-low"],
    afterSummary: 5,
    pending: 0,
    excluded: 0,
    total: 5,
    needed: false,
  },
}

const pendingOoc: Fixture = {
  name: "pending + OOC",
  conversation: mkConversation(),
  characterVersion: mkVersion(),
  character: mkCharacter(),
  messages: [
    mkMessage("msg-1", "user", "Hola //instruccion vieja//", 1),
    mkMessage("msg-2", "assistant", "Respuesta.", 2),
    mkMessage("msg-3", "user", "*Actúa.* //nueva instruccion//", 3),
  ],
  summary: null,
  memories: [],
  pendingMessages: [mkMessage("msg-4", "user", "Mensaje pendiente final", 4)],
  locale: "es",
  expected: {
    sectionIds: ["character", "ooc", "history", "pending"],
    memoriesIncluded: [],
    memoriesExcluded: [],
    afterSummary: 3,
    pending: 1,
    excluded: 0,
    total: 4,
    needed: false,
  },
}

const compactionNeeded: Fixture = {
  name: "compaction needed",
  conversation: mkConversation({ contextWindow: 400, compactionThreshold: 50 }),
  characterVersion: mkVersion(),
  character: mkCharacter(),
  messages: [
    mkMessage(
      "msg-1",
      "user",
      "A long opening message to inflate the context beyond the tiny window.",
      1
    ),
    mkMessage(
      "msg-2",
      "assistant",
      "A long reply to inflate the context further.",
      2
    ),
  ],
  summary: null,
  memories: [],
  locale: "en",
  expected: {
    sectionIds: ["character", "history"],
    memoriesIncluded: [],
    memoriesExcluded: [],
    afterSummary: 2,
    pending: 0,
    excluded: 0,
    total: 2,
    needed: true,
  },
}

const noWindow: Fixture = {
  name: "no window",
  conversation: mkConversation({ contextWindow: null }),
  characterVersion: mkVersion(),
  character: mkCharacter(),
  messages: [
    mkMessage("msg-1", "user", "Hello.", 1),
    mkMessage("msg-2", "assistant", "Hi there.", 2),
  ],
  summary: null,
  memories: [],
  locale: "en",
  expected: {
    sectionIds: ["character", "history"],
    memoriesIncluded: [],
    memoriesExcluded: [],
    afterSummary: 2,
    pending: 0,
    excluded: 0,
    total: 2,
    needed: false,
  },
}

const FIXTURES: Fixture[] = [
  summaryBoundary,
  memoryPriorityDecay,
  pendingOoc,
  compactionNeeded,
  noWindow,
]

describe("context assembly evals", () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.name}: systemPrompt matches the builder exactly`, async () => {
      const { reference, context } = await assemble(fixture)
      expect(context.systemPrompt).toBe(reference.systemPrompt)
      expect(context.messages).toEqual(reference.messages)
    })

    it(`${fixture.name}: reports the expected section ids in order`, async () => {
      const { manifest } = await assemble(fixture)
      const ids = manifest.sections.map((section) => section.id)
      const indexOf = (id: string) => ids.indexOf(id)
      for (const expected of fixture.expected.sectionIds) {
        expect(ids, `missing section "${expected}"`).toContain(expected)
      }
      for (let i = 1; i < fixture.expected.sectionIds.length; i += 1) {
        expect(indexOf(fixture.expected.sectionIds[i - 1])).toBeLessThan(
          indexOf(fixture.expected.sectionIds[i])
        )
      }
    })

    it(`${fixture.name}: reports memory inclusion/exclusion counts`, async () => {
      const { loaded, manifest } = await assemble(fixture)

      expect(loaded.promptMemories.map((m) => m.id)).toEqual(
        fixture.expected.memoriesIncluded
      )
      const total =
        fixture.expected.memoriesIncluded.length +
        fixture.expected.memoriesExcluded.length
      expect(manifest.memories).toEqual({
        total,
        included: fixture.expected.memoriesIncluded.length,
        excluded: fixture.expected.memoriesExcluded.length,
      })
    })

    it(`${fixture.name}: reports message selection counts`, async () => {
      const { manifest } = await assemble(fixture)
      expect(manifest.messages).toEqual({
        afterSummary: fixture.expected.afterSummary,
        pending: fixture.expected.pending,
        excluded: fixture.expected.excluded,
        total: fixture.expected.total,
      })
    })

    it(`${fixture.name}: estimates tokens from the built context`, async () => {
      const { context, manifest } = await assemble(fixture)

      const inputTokens =
        estimateTextTokens(context.systemPrompt) +
        estimateMessagesTokens(context.messages)
      expect(manifest.estimatedInputTokens).toBe(inputTokens)
      expect(manifest.estimatedTotalTokens).toBe(
        inputTokens + manifest.outputReserve
      )

      // Every section in the expected set carries positive tokens.
      for (const id of fixture.expected.sectionIds) {
        const section = manifest.sections.find(
          (candidate) => candidate.id === id
        )
        expect(section, `missing section "${id}"`).toBeDefined()
        expect(section!.tokens).toBeGreaterThan(0)
      }
    })

    it(`${fixture.name}: reports the correct compaction state`, async () => {
      const { manifest } = await assemble(fixture)
      expect(manifest.compaction.needed).toBe(fixture.expected.needed)
      expect(manifest.compaction.applied).toBe(false)
    })
  }

  it("no window: exposes a null context window without breaking the manifest", async () => {
    const { manifest } = await assemble(noWindow)
    expect(manifest.contextWindow).toBeNull()
    expect(manifest.compaction.needed).toBe(false)
    expect(manifest.sections.length).toBeGreaterThan(0)
  })

  it("compaction needed: preview marks needed but never applies", async () => {
    const { manifest } = await assemble(compactionNeeded)
    expect(manifest.compaction).toEqual({
      needed: true,
      applied: false,
      threshold: 50,
    })
  })

  it("summary boundary: only messages after the summary are counted", async () => {
    const { loaded, manifest } = await assemble(summaryBoundary)
    expect(loaded.messagesAfterSummary.map((m) => m.id)).toEqual([
      "msg-3",
      "msg-4",
      "msg-5",
    ])
    expect(manifest.summary).toEqual({
      id: "sum-1",
      firstMessageId: "msg-0",
      lastMessageId: "msg-2",
      messagesAfter: 3,
    })
  })
})
