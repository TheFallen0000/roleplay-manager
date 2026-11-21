import { describe, it, expect } from "vitest"

import { resolveEffectiveWindow } from "@workspace/shared/lib/context-window"
import { estimateTextTokens } from "@workspace/shared/lib/token-estimate"

import { ConversationContextLoader } from "../src/application/services/conversation-context-loader.service"
import { ContextCompiler } from "../src/application/services/context-compiler.service"
import { MemoryDecayPolicy } from "../src/domain/value-objects/memory-decay-policy"
import type { CharacterRepository } from "../src/domain/ports/character.repository"
import type { ConversationRepository } from "../src/domain/ports/conversation.repository"
import type { MemoryRepository } from "../src/domain/ports/memory.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../src/domain/ports/message.repository"
import type { PlayerCharacterRepository } from "../src/domain/ports/player-character.repository"
import type { SummaryRepository } from "../src/domain/ports/summary.repository"
import { PromptContextBuilderImpl } from "../src/infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl"
import { filterMemoriesForPrompt } from "../src/lib/memory-decay"
import { buildMessageHistoryRepository } from "../src/test-utils/message-history"
import {
  memoryRetrievalFixtures,
  type MemoryRetrievalEvalFixture,
} from "./fixtures/memory-retrieval"

const MEMORY_REASONS = new Set([
  "actor",
  "keyword",
  "priority",
  "thread",
  "budget",
  "decay",
  "not-relevant",
])

const buildRepos = (fixture: MemoryRetrievalEvalFixture) => {
  const byId = new Map(fixture.messages.map((message) => [message.id, message]))
  const findPositionById = async (id: string) => {
    const message = byId.get(id)
    return message ? message.position : null
  }

  const conversationRepository: ConversationRepository = {
    create: async (conversation) => conversation,
    findById: async () => fixture.conversation,
    list: async () => [],
    listByCharacterId: async () => [],
    listByCharacterIds: async () => [],
    existsByAssetId: async () => false,
    update: async (conversation) => conversation,
    updateSettings: async (_id, _settings) => fixture.conversation,
    clearProviderInstanceId: async () => {},
  }
  const characterRepository: CharacterRepository = {
    createWithFirstVersion: async () => ({
      character: fixture.character,
      version: fixture.characterVersion,
    }),
    findById: async () => ({
      character: fixture.character,
      currentVersion: fixture.characterVersion,
    }),
    list: async () => [],
    update: async (character) => character,
    delete: async () => {},
    findVersionById: async () => fixture.characterVersion,
    findVersionsByCharacterId: async () => [],
    findMaxVersionNumber: async () => 0,
    saveVersion: async (version) => version,
    updateProfileImageAssetId: async () => {},
  }
  const messageHistoryRepository: MessageHistoryRepository =
    buildMessageHistoryRepository(
      () => fixture.messages,
      findPositionById,
    )
  const messageRepository: MessageRepository = {
    create: async (message) => message,
    findByConversationId: async () => fixture.messages,
    findById: async (id) => byId.get(id) ?? null,
    findLastByConversationId: async () => fixture.messages.at(-1) ?? null,
    update: async (message) => message,
    deleteById: async () => {},
    deleteAfterPosition: async () => {},
    clearAlternatives: async () => {},
  }
  const memoryRepository: MemoryRepository = {
    findById: async () => null,
    findByConversationId: async () => fixture.memories,
    create: async (memory) => memory,
    update: async (memory) => memory,
    deleteById: async () => {},
  }
  const summaryRepository: SummaryRepository = {
    findById: async () => null,
    findByConversationId: async () => [],
    findLatestByConversationId: async () => null,
    create: async (summary) => summary,
    update: async (summary) => summary,
    deleteById: async () => {},
    deleteByIds: async () => {},
  }
  const playerCharacterRepository: PlayerCharacterRepository = {
    findById: async () => fixture.playerCharacter,
    list: async () => [fixture.playerCharacter],
    create: async (playerCharacter) => playerCharacter,
    update: async (playerCharacter) => playerCharacter,
    delete: async () => {},
  }

  return {
    conversationRepository,
    characterRepository,
    messageHistoryRepository,
    messageRepository,
    memoryRepository,
    summaryRepository,
    playerCharacterRepository,
  }
}

const assemble = async (fixture: MemoryRetrievalEvalFixture) => {
  const loader = new ConversationContextLoader(buildRepos(fixture) as never)
  const loaded = await loader.load({
    conversationId: fixture.conversation.id,
    pendingMessages: [fixture.pendingMessage],
  })

  const builder = new PromptContextBuilderImpl()
  const compiler = new ContextCompiler(builder)
  const { manifest } = await compiler.compile({
    conversation: fixture.conversation,
    characterVersion: fixture.characterVersion,
    messages: loaded.messages,
    pendingCount: loaded.pendingMessages.length,
    excludedCount: 0,
    memories: loaded.memories,
    promptMemories: loaded.promptMemories,
    memorySelection: loaded.memorySelection,
    summary: loaded.latestSummary,
    playerCharacter: loaded.playerCharacter,
    locale: "en",
    outputReserve: fixture.conversation.maxTokens,
    compaction: { needed: false, applied: false },
  })

  return { loaded, manifest, builder }
}

const memoryBudget = (fixture: MemoryRetrievalEvalFixture): number => {
  const effective = resolveEffectiveWindow({
    contextWindow: fixture.conversation.contextWindow,
    workingWindow: fixture.conversation.workingWindow,
    maxTokens: fixture.conversation.maxTokens,
  })
  if (effective.window === null) return 512
  return Math.min(2048, Math.max(256, Math.round(effective.window * 0.12)))
}

const metrics = (
  fixture: MemoryRetrievalEvalFixture,
  includedIds: string[],
) => {
  const included = new Set(includedIds)
  const relevant = new Set(fixture.relevantIds)
  const irrelevant = new Set(fixture.irrelevantIds)
  const hits = [...relevant].filter((id) => included.has(id)).length
  const noise = [...included].filter((id) => irrelevant.has(id)).length

  return {
    recall: relevant.size === 0 ? 1 : hits / relevant.size,
    irrelevantRate: included.size === 0 ? 0 : noise / included.size,
    includedCount: included.size,
    noiseCount: noise,
  }
}

const memorySectionTokens = (
  manifest: Awaited<ReturnType<typeof assemble>>["manifest"],
): number =>
  manifest.sections.find((section) => section.id === "memories")?.tokens ?? 0

describe("memory retrieval eval", () => {
  it.each(memoryRetrievalFixtures.map((fixture) => [fixture.name, fixture] as const))(
    "%s: selection has one entry per memory with a known reason",
    async (_name, fixture) => {
      const { loaded, manifest } = await assemble(fixture)

      expect(loaded.memorySelection).toHaveLength(fixture.memories.length)
      expect(new Set(loaded.memorySelection.map((entry) => entry.id))).toEqual(
        new Set(fixture.memories.map((memory) => memory.id)),
      )
      for (const entry of loaded.memorySelection) {
        expect(MEMORY_REASONS.has(entry.reason), entry.reason).toBe(true)
        expect(typeof entry.score).toBe("number")
      }
      expect(
        loaded.memorySelection.filter((entry) => entry.included).length,
      ).toBe(loaded.promptMemories.length)
      expect(
        loaded.memorySelection
          .filter((entry) => entry.included)
          .map((entry) => entry.id),
      ).toEqual(loaded.promptMemories.map((memory) => memory.id))

      expect(manifest.memories.selection).toHaveLength(fixture.memories.length)
    },
  )

  it.each(memoryRetrievalFixtures.map((fixture) => [fixture.name, fixture] as const))(
    "%s: meets recall, precision and budget thresholds",
    async (name, fixture) => {
      const started = performance.now()
      const { loaded, manifest, builder } = await assemble(fixture)
      const scoringMs = performance.now() - started
      const includedIds = loaded.promptMemories.map((memory) => memory.id)
      const { recall, irrelevantRate, includedCount, noiseCount } = metrics(
        fixture,
        includedIds,
      )
      const budget = memoryBudget(fixture)
      const tokens = memorySectionTokens(manifest)

      expect(recall).toBeGreaterThanOrEqual(0.8)
      expect(irrelevantRate).toBeLessThanOrEqual(0.2)
      expect(tokens).toBeLessThanOrEqual(budget)

      const baselineMemories = filterMemoriesForPrompt(
        fixture.conversation,
        fixture.memories,
        fixture.messages
          .filter((message) => message.role === "user")
          .map((message) => ({ role: "user", createdAt: message.createdAt })),
      )
      const baselineReference = await builder.buildWithSections({
        characterVersion: fixture.characterVersion,
        messages: [],
        recentMessageCount: 0,
        memories: baselineMemories,
      })
      const baselineSection = baselineReference.sections.find(
        (section) => section.id === "memories",
      )
      const baselineTokens = baselineSection
        ? estimateTextTokens(baselineSection.content)
        : 0

      if (name === memoryRetrievalFixtures[0].name) {
        expect(baselineMemories.length).toBeGreaterThan(includedCount)
        expect(baselineTokens).toBeGreaterThan(tokens)
      }

      console.log(
        `[memory-retrieval] ${name}: recall=${recall.toFixed(2)} irrelevant=${irrelevantRate.toFixed(2)} (${noiseCount}/${includedCount}) tokens=${tokens}/${budget} included=${includedCount} baseline=${baselineMemories.length}/${baselineTokens}t scoring=${scoringMs.toFixed(1)}ms`,
      )
    },
  )

  it.each(memoryRetrievalFixtures.map((fixture) => [fixture.name, fixture] as const))(
    "%s: is deterministic and keeps the same order across runs",
    async (_name, fixture) => {
      const first = await assemble(fixture)
      const second = await assemble(fixture)

      expect(second.loaded.promptMemories.map((memory) => memory.id)).toEqual(
        first.loaded.promptMemories.map((memory) => memory.id),
      )
      expect(second.loaded.memorySelection).toEqual(
        first.loaded.memorySelection,
      )
      expect(second.manifest.memories.selection).toEqual(
        first.manifest.memories.selection,
      )
    },
  )

  it.each(
    memoryRetrievalFixtures
      .filter((fixture) => fixture.expectsBudgetCut)
      .map((fixture) => [fixture.name, fixture] as const),
  )("%s: marks the memories dropped by the budget", async (_name, fixture) => {
    const { loaded } = await assemble(fixture)

    expect(loaded.memorySelection.some((entry) => entry.reason === "budget")).toBe(
      true,
    )
  })

  it.each(
    memoryRetrievalFixtures
      .filter((fixture) => fixture.expectsDecay)
      .map((fixture) => [fixture.name, fixture] as const),
  )("%s: marks the memories dropped by decay", async (_name, fixture) => {
    const { loaded } = await assemble(fixture)

    expect(loaded.memorySelection.some((entry) => entry.reason === "decay")).toBe(
      true,
    )
    for (const id of fixture.irrelevantIds) {
      expect(loaded.promptMemories.map((memory) => memory.id)).not.toContain(id)
    }
  })

  it("score ties keep id ascending order", async () => {
    const tieFixture = memoryRetrievalFixtures[4]
    const { loaded } = await assemble(tieFixture)
    const ids = loaded.promptMemories
      .map((memory) => memory.id)
      .filter((id) => /^m5-[a-f]$/.test(id))

    expect(ids).toEqual(["m5-a", "m5-b", "m5-c", "m5-d", "m5-e", "m5-f"])
  })

  it("tie scenario keeps every tied memory decay-eligible", () => {
    const tieFixture = memoryRetrievalFixtures[4]
    const policy = MemoryDecayPolicy.fromConversation(tieFixture.conversation)
    const tied = tieFixture.memories.filter((memory) =>
      tieFixture.relevantIds.includes(memory.id),
    )

    expect(tied).toHaveLength(6)
    for (const memory of tied) {
      const turns = policy.turnsSince(memory.updatedAt, tieFixture.messages)
      expect(
        policy.isPromptEligible(memory.priority, turns),
        `${memory.id} should be above the decay threshold`,
      ).toBe(true)
    }
  })
})
