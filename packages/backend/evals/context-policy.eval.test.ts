import { describe, expect, it } from "vitest"

import { resolveContextBudget } from "@workspace/shared/lib/context-policy"
import { resolveEffectiveWindow } from "@workspace/shared/lib/context-window"

import { ContextCompiler } from "../src/application/services/context-compiler.service"
import { selectMemoriesForPrompt } from "../src/application/services/memory-retrieval.service"
import { GenerateSummaryUseCase } from "../src/application/use-cases/summary/generate-summary.use-case"
import type { CharacterRepository } from "../src/domain/ports/character.repository"
import type { ConversationRepository } from "../src/domain/ports/conversation.repository"
import type { MemoryRepository } from "../src/domain/ports/memory.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../src/domain/ports/message.repository"
import type { ProviderInstanceRepository } from "../src/domain/ports/provider-instance.repository"
import type {
  ProviderPort,
  ProviderRegistry,
} from "../src/domain/ports/provider.port"
import type { SummaryRepository } from "../src/domain/ports/summary.repository"
import type { Logger } from "../src/domain/ports/logger.port"
import { PromptContextBuilderImpl } from "../src/infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl"
import { buildMessageHistoryRepository } from "../src/test-utils/message-history"
import {
  memoryRetrievalFixtures,
  type MemoryRetrievalEvalFixture,
} from "./fixtures/memory-retrieval"
import { memoryVectorRetrievalFixtures } from "./fixtures/memory-vector-retrieval"
import {
  contextPolicyFixtures,
  makeCharacter,
  makeCharacterVersion,
  makeMemories,
  makeMessage,
  makePolicyConversation,
  type ContextPolicyEvalFixture,
} from "./fixtures/context-policy"

const summarizeFixture = (fixture: MemoryRetrievalEvalFixture) => {
  const conversation = fixture.conversation
  return selectMemoriesForPrompt({
    conversation,
    memories: fixture.memories,
    messages: fixture.messages
      .filter((message) => message.role === "user")
      .map((message) => ({ role: "user", createdAt: message.createdAt })),
    pendingMessage: fixture.pendingMessage.content,
    mainActors: [fixture.character.name, fixture.playerCharacter.name],
  })
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
  }
}

const selectFixture = (fixture: ContextPolicyEvalFixture) =>
  selectMemoriesForPrompt({
    conversation: fixture.conversation,
    memories: fixture.memories,
    messages: [],
    pendingMessage: fixture.pendingMessage.content,
    mainActors: [fixture.character.name, fixture.playerCharacter.name],
  })

// Current S136 constants, written out on purpose: the parity check must not
// call the function under test.
const baselineMemoryBudget = (window: number | null): number =>
  window === null
    ? 512
    : Math.min(2_048, Math.max(256, Math.round(window * 0.12)))

const baselineSummaryBudget = (window: number | null): number =>
  window === null
    ? 256
    : Math.min(1_024, Math.max(256, Math.floor(window * 0.1)))

const planFor = (
  policy: "fast" | "balanced" | "deep",
  contextWindow: number | null,
  conversation?: {
    workingWindow?: number | null
    maxTokens?: number | null
  },
) =>
  resolveContextBudget({
    policy,
    contextWindow,
    workingWindow: conversation?.workingWindow ?? null,
    maxTokens: conversation?.maxTokens ?? null,
  })

describe("context policy eval: balanced baseline", () => {
  it.each(
    memoryRetrievalFixtures.map((fixture) => [fixture.name, fixture] as const),
  )("%s: matches the current memory, summary and compaction budgets", async (_name, fixture) => {
    const conversation = fixture.conversation
    const plan = resolveContextBudget({
      policy: "balanced",
      contextWindow: conversation.contextWindow,
      workingWindow: conversation.workingWindow,
      maxTokens: conversation.maxTokens,
    })
    const effective = resolveEffectiveWindow({
      contextWindow: conversation.contextWindow,
      workingWindow: conversation.workingWindow,
      maxTokens: conversation.maxTokens,
    })

    expect(plan.window).toBe(effective.window)
    expect(plan.outputReserve).toBe(effective.outputReserve)
    expect(plan.memoryBudget).toBe(baselineMemoryBudget(plan.window))
    expect(plan.summaryOutputBudget).toBe(baselineSummaryBudget(plan.window))
    expect(plan.compactionThreshold).toBe(80)
    expect(plan.compactionTarget).toBe(60)

    const selection = summarizeFixture(fixture)
    expect(selection.budget).toBe(plan.memoryBudget)
    expect(selection.tokens).toBeLessThanOrEqual(plan.memoryBudget)

    const { recall, irrelevantRate } = metrics(
      fixture,
      selection.memories.map((memory) => memory.id),
    )
    expect(recall).toBeGreaterThanOrEqual(0.8)
    expect(irrelevantRate).toBeLessThanOrEqual(0.2)
  })

  it.each(
    memoryVectorRetrievalFixtures.map(
      (fixture) => [fixture.name, fixture] as const,
    ),
  )("%s: keeps the S137 conversation on the same balanced budget", async (_name, fixture) => {
    const conversation = fixture.conversation
    const plan = resolveContextBudget({
      policy: "balanced",
      contextWindow: conversation.contextWindow,
      workingWindow: conversation.workingWindow,
      maxTokens: conversation.maxTokens,
    })
    const selection = summarizeFixture(fixture)

    expect(plan.memoryBudget).toBe(baselineMemoryBudget(plan.window))
    expect(selection.budget).toBe(plan.memoryBudget)
    expect(selection.tokens).toBeLessThanOrEqual(plan.memoryBudget)
  })

  it("floors the balanced summaryOutput budget on a net 5735 window", () => {
    const plan = planFor("balanced", 8_192, {
      workingWindow: 5_735,
      maxTokens: 2_048,
    })
    expect(plan.window).toBe(5_735)
    expect(plan.summaryOutputBudget).toBe(573)
    expect(plan.memoryBudget).toBe(688)
    expect(plan.summaryMemoryBudget).toBe(688)
  })
})

describe("context policy eval: policies", () => {
  it("fast includes fewer memories than balanced and deep includes more", () => {
    const byName = (name: string) => {
      const fixture = contextPolicyFixtures.find((item) => item.name === name)
      if (!fixture) throw new Error(`Missing fixture: ${name}`)
      return fixture
    }
    const fast = byName("fast 8k many memories")
    const balanced = byName("balanced 8k many memories with summary")
    const deep = byName("deep 8k many memories")

    const fastPlan = planFor("fast", 8_000)
    const balancedPlan = planFor("balanced", 8_000)
    const deepPlan = planFor("deep", 8_000)
    expect(fastPlan.memoryBudget).toBe(480)
    expect(balancedPlan.memoryBudget).toBe(960)
    expect(deepPlan.memoryBudget).toBe(1_440)

    const fastSelection = selectFixture(fast)
    const balancedSelection = selectFixture(balanced)
    const deepSelection = selectFixture(deep)
    const ids = (selection: ReturnType<typeof selectFixture>) =>
      selection.memories.map((memory) => memory.id)

    expect(fastSelection.tokens).toBeLessThanOrEqual(fastPlan.memoryBudget)
    expect(balancedSelection.tokens).toBeLessThanOrEqual(
      balancedPlan.memoryBudget,
    )
    expect(deepSelection.tokens).toBeLessThanOrEqual(deepPlan.memoryBudget)

    expect(fastSelection.memories.length).toBeLessThan(
      balancedSelection.memories.length,
    )
    expect(balancedSelection.memories.length).toBeLessThan(
      deepSelection.memories.length,
    )

    // The caps cut by stable score order, so the shorter list is a prefix.
    expect(ids(balancedSelection).slice(0, fastSelection.memories.length)).toEqual(
      ids(fastSelection),
    )
    expect(ids(deepSelection).slice(0, balancedSelection.memories.length)).toEqual(
      ids(balancedSelection),
    )
  })

  it("does not compact or invent a window when contextWindow is null", () => {
    const fallbacks = {
      fast: { memory: 256, summaryOutput: 128, summaryMemory: 256 },
      balanced: { memory: 512, summaryOutput: 256, summaryMemory: 512 },
      deep: { memory: 1_024, summaryOutput: 512, summaryMemory: 1_024 },
    } as const

    for (const policy of ["fast", "balanced", "deep"] as const) {
      const plan = planFor(policy, null)
      expect(plan.window).toBeNull()
      expect(plan.memoryBudget).toBe(fallbacks[policy].memory)
      expect(plan.summaryOutputBudget).toBe(fallbacks[policy].summaryOutput)
      expect(plan.summaryMemoryBudget).toBe(fallbacks[policy].summaryMemory)
    }
  })

  it("clamps deep on a small window and keeps the compiled prompt inside it", async () => {
    const fixture = contextPolicyFixtures.find(
      (item) => item.name === "deep 4k many memories with lorebook and summary",
    )
    expect(fixture).toBeDefined()
    const items = fixture!
    const plan = planFor("deep", 4_000)
    const selection = selectFixture(items)

    expect(plan.memoryBudget).toBe(720)
    expect(plan.summaryOutputBudget).toBe(600)
    expect(plan.summaryMemoryBudget).toBe(720)
    expect(
      plan.memoryBudget + plan.summaryOutputBudget + plan.summaryMemoryBudget,
    ).toBeLessThanOrEqual(4_000)

    const compiler = new ContextCompiler(new PromptContextBuilderImpl())
    const { manifest } = await compiler.compile({
      conversation: items.conversation,
      characterVersion: items.characterVersion,
      messages: [...items.messages, items.pendingMessage],
      pendingCount: 1,
      excludedCount: 0,
      memories: items.memories,
      promptMemories: selection.memories,
      memorySelection: selection.selection,
      summary: items.summary,
      playerCharacter: items.playerCharacter,
      lorebook: items.lorebook,
      locale: "en",
      outputReserve: plan.outputReserve,
      compaction: { needed: false, applied: false },
    })

    expect(manifest.contextPolicy).toBe("deep")
    expect(manifest.budget.window).toBe(4_000)
    expect(manifest.estimatedTotalTokens).toBeLessThanOrEqual(4_000)
    expect(selection.tokens).toBeLessThanOrEqual(plan.memoryBudget)
  })

  it("is deterministic across two runs", () => {
    const fixture = contextPolicyFixtures.find(
      (item) => item.name === "deep 8k many memories",
    )
    expect(fixture).toBeDefined()
    const items = fixture!

    expect(planFor("deep", 8_000)).toEqual(planFor("deep", 8_000))
    const first = selectFixture(items)
    const second = selectFixture(items)
    expect(second.selection).toEqual(first.selection)
    expect(second.memories.map((memory) => memory.id)).toEqual(
      first.memories.map((memory) => memory.id),
    )
  })
})

describe("context policy eval: generate-summary", () => {
  const buildHarness = (params: {
    contextWindow: number
    memoryCount: number
  }) => {
    const conversation = makePolicyConversation({
      id: "conv-summary-eval",
      policy: "deep",
      contextWindow: params.contextWindow,
      maxTokens: 2_048,
    })
    const character = makeCharacter()
    const version = makeCharacterVersion()
    const memories = makeMemories(conversation.id, params.memoryCount, {
      priority: 9,
      prefix: "sum-mem",
    })
    const messages = Array.from({ length: 10 }, (_, index) =>
      makeMessage(
        conversation.id,
        `msg-${index}`,
        index % 2 === 0 ? "user" : "assistant",
        `Turno ${index + 1}.`,
        index,
      ),
    )

    const messageRepository: MessageRepository = {
      create: async (message) => message,
      findByConversationId: async () => messages,
      findById: async (id) => messages.find((message) => message.id === id) ?? null,
      findLastByConversationId: async () => messages.at(-1) ?? null,
      update: async (message) => message,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    }
    const messageHistoryRepository: MessageHistoryRepository =
      buildMessageHistoryRepository(
        () => messages,
        async (id) => {
          const index = Number(id.replace(/^msg-/, ""))
          return Number.isNaN(index) ? null : index
        },
      )
    const conversationRepository: ConversationRepository = {
      create: async (item) => item,
      findById: async () => conversation,
      list: async () => [],
      listByCharacterId: async () => [],
      listByCharacterIds: async () => [],
      existsByAssetId: async () => false,
      update: async (item) => item,
      updateSettings: async () => conversation,
      clearProviderInstanceId: async () => {},
    }
    const characterRepository: CharacterRepository = {
      createWithFirstVersion: async () => ({ character, version }),
      findById: async () => ({ character, currentVersion: version }),
      list: async () => [],
      update: async (item) => item,
      delete: async () => {},
      findVersionById: async () => version,
      findVersionsByCharacterId: async () => [],
      findMaxVersionNumber: async () => 0,
      saveVersion: async (item) => item,
      updateProfileImageAssetId: async () => {},
    }
    const memoryRepository: MemoryRepository = {
      findById: async () => null,
      findByConversationId: async () => memories,
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
    const capturedOptions: Array<{ maxTokens?: number }> = []
    const capturedPrompts: string[] = []
    const adapter: ProviderPort = {
      generateStreaming: async function* (_context, options) {
        capturedOptions.push(options ?? {})
        capturedPrompts.push(_context.systemPrompt)
        yield { content: "Resumen generado." }
      },
      validateConnection: async () => ({ ok: true }) as never,
      listModels: async () => ({ models: [], manualEntryRequired: false }),
    }
    const providerRegistry: ProviderRegistry = {
      listRegistered: () => ["ollama"],
      getAdapter: async () => adapter,
      createAdapter: () => adapter,
    }
    const providerInstanceRepository: ProviderInstanceRepository = {
      list: async () => [],
      findById: async () => null,
      create: async () => ({}) as never,
      update: async () => ({}) as never,
      delete: async () => {},
    }
    const logger: Logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      child: () => logger,
    }

    const useCase = new GenerateSummaryUseCase(
      conversationRepository,
      messageRepository,
      messageHistoryRepository,
      characterRepository,
      memoryRepository,
      summaryRepository,
      providerRegistry,
      {
        execute: async () => ({
          provider: "ollama",
          providerInstanceId: null,
          models: { ollama: "llama3" },
        }),
      } as never,
      providerInstanceRepository,
      logger,
      null,
    )

    return {
      conversation,
      memories,
      messages,
      useCase,
      capturedOptions,
      capturedPrompts,
    }
  }

  it("uses the same retrieval as chat with the summary memory cap", async () => {
    const harness = buildHarness({ contextWindow: 8_000, memoryCount: 50 })
    const plan = planFor("deep", 8_000)
    const expected = selectMemoriesForPrompt({
      conversation: harness.conversation,
      memories: harness.memories,
      messages: harness.messages
        .filter((message) => message.role === "user")
        .map((message) => ({ role: "user", createdAt: message.createdAt })),
      pendingMessage: "",
      mainActors: ["Lyra", "Alice"],
      budget: plan.summaryMemoryBudget,
    })

    expect(expected.budget).toBe(plan.summaryMemoryBudget)
    expect(expected.memories.length).toBeLessThan(harness.memories.length)
    expect(expected.tokens).toBeLessThanOrEqual(plan.summaryMemoryBudget)

    await harness.useCase.execute(harness.conversation.id, { locale: "en" })

    expect(harness.capturedPrompts).toHaveLength(1)
    const systemPrompt = harness.capturedPrompts[0]
    const included = new Set(expected.memories.map((memory) => memory.id))
    for (const memory of harness.memories) {
      if (included.has(memory.id)) {
        expect(systemPrompt).toContain(`[${memory.id}]`)
      } else {
        expect(systemPrompt).not.toContain(`[${memory.id}]`)
      }
    }

    expect(harness.capturedOptions).toHaveLength(1)
    expect(harness.capturedOptions[0].maxTokens).toBe(
      plan.summaryOutputBudget,
    )
  })
})
