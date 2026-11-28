import { describe, expect, it } from "vitest"

import { estimateTextTokens } from "@workspace/shared/lib/token-estimate"
import type { MemoryType } from "@workspace/shared/types/memory"

import { CharacterVersion } from "../../domain/entities/character-version.entity"
import { Conversation } from "../../domain/entities/conversation.entity"
import { Memory } from "../../domain/entities/memory.entity"
import { MemoryDecayPolicy } from "../../domain/value-objects/memory-decay-policy"
import { PromptContextBuilderImpl } from "../../infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl"
import { selectMemoriesForPrompt } from "./memory-retrieval.service"

const now = new Date("2026-11-21T12:00:00.000Z")

const mkConversation = (
  overrides: {
    contextWindow?: number | null
    memoryDecayMode?: "silent" | "manual" | "off"
    memoryDecayThreshold?: number
    memoryDecaySpeed?: number
  } = {},
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
    compactionThreshold: 80,
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

const mkMemory = (
  id: string,
  overrides: {
    type?: MemoryType
    priority?: number
    updatedAt?: Date
    actor?: string
    title?: string
    description?: string
  } = {},
): Memory =>
  Memory.reconstruct({
    id,
    conversationId: "conv-1",
    actor: overrides.actor ?? "Nadie",
    title: overrides.title ?? `Memory ${id}`,
    description: overrides.description ?? "A stored memory.",
    priority: overrides.priority ?? 4,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
    type: overrides.type,
  })

const userMessages = (count: number, after: Date = now): { role: string; createdAt: Date }[] =>
  Array.from({ length: count }, (_, index) => ({
    role: "user",
    createdAt: new Date(after.getTime() + (index + 1) * 60_000),
  }))

const select = (params: {
  memories: Memory[]
  pendingMessage?: string
  mainActors?: string[]
  messages?: { role: string; createdAt: Date }[]
  conversation?: Conversation
}) =>
  selectMemoriesForPrompt({
    conversation: params.conversation ?? mkConversation(),
    memories: params.memories,
    messages: params.messages ?? [],
    pendingMessage: params.pendingMessage ?? "",
    mainActors: params.mainActors ?? [],
  })

const selectionOf = (
  result: ReturnType<typeof select>,
  id: string,
) => result.selection.find((entry) => entry.id === id)

describe("selectMemoriesForPrompt", () => {
  it("scores an actor named in the pending message above an unrelated high priority", () => {
    const result = select({
      memories: [
        mkMemory("mem-actor", { actor: "Lyra", title: "Misión", priority: 4 }),
        mkMemory("mem-priority", { actor: "Marcus", title: "Deuda", priority: 10 }),
      ],
      pendingMessage: "Lyra entra en la sala.",
    })

    expect(result.memories[0].id).toBe("mem-actor")
    expect(selectionOf(result, "mem-actor")?.score).toBeGreaterThan(
      selectionOf(result, "mem-priority")?.score ?? 0,
    )
    expect(selectionOf(result, "mem-actor")?.reason).toBe("actor")
  })

  it("includes a memory owned by a main actor without a lexical hit", () => {
    const result = select({
      memories: [mkMemory("mem-main", { actor: "Alice", priority: 4 })],
      pendingMessage: "El viento sopla.",
      mainActors: ["Alice", "Lyra"],
    })

    expect(selectionOf(result, "mem-main")).toMatchObject({
      included: true,
      reason: "actor",
    })
  })

  it("matches keywords after lowercasing and stripping accents", () => {
    const result = select({
      memories: [
        mkMemory("mem-keyword", {
          actor: "Nadie",
          title: "Poción lunar",
          description: "Preparada en el bosque.",
          priority: 4,
        }),
      ],
      pendingMessage: "Busco la pocion lunar.",
    })

    expect(selectionOf(result, "mem-keyword")).toMatchObject({
      included: true,
      reason: "keyword",
    })
  })

  it("ignores stopwords, two-letter tokens and actor substrings", () => {
    const result = select({
      memories: [
        mkMemory("mem-short", {
          actor: "Nadie",
          title: "de la fe",
          description: "sin",
          priority: 4,
        }),
        mkMemory("mem-substring", {
          actor: "Ana",
          title: "Rutina",
          description: "Sin detalles.",
          priority: 4,
        }),
      ],
      pendingMessage: "Mariana pasea. de la fe",
    })

    expect(selectionOf(result, "mem-short")).toMatchObject({
      included: false,
      reason: "not-relevant",
    })
    expect(selectionOf(result, "mem-substring")).toMatchObject({
      included: false,
      reason: "not-relevant",
    })
  })

  it("caps keyword hits at five unique tokens", () => {
    const pendingMessage =
      "alfa bravo charlie delta echo foxtrot golf hotel india juliet"
    const base = {
      actor: "Nadie",
      priority: 5,
      updatedAt: now,
      type: "fact" as MemoryType,
      description: "Sin detalles.",
    }
    const result = select({
      memories: [
        mkMemory("mem-4", {
          ...base,
          title: "alfa bravo charlie delta",
        }),
        mkMemory("mem-5", {
          ...base,
          title: "alfa bravo charlie delta echo",
        }),
        mkMemory("mem-6", {
          ...base,
          title: "alfa bravo charlie delta echo foxtrot",
        }),
        mkMemory("mem-10", {
          ...base,
          title:
            "alfa bravo charlie delta echo foxtrot golf hotel india juliet",
        }),
      ],
      pendingMessage,
    })

    const score = (id: string) => selectionOf(result, id)?.score ?? 0

    expect(score("mem-4")).toBeLessThan(score("mem-5"))
    expect(score("mem-5")).toBe(score("mem-6"))
    expect(score("mem-6")).toBe(score("mem-10"))
  })

  it("includes a thread without a lexical hit", () => {
    const result = select({
      memories: [
        mkMemory("mem-thread", {
          actor: "Marcus",
          title: "Promesa pendiente",
          type: "thread",
          // Above the decay threshold: the test measures the thread entry rule,
          // not a thread-specific decay exemption.
          priority: 4,
        }),
      ],
      pendingMessage: "Cae la noche.",
    })

    expect(selectionOf(result, "mem-thread")).toMatchObject({
      included: true,
      reason: "thread",
    })
  })

  it("weights threads above facts when both have the same signal", () => {
    const result = select({
      memories: [
        mkMemory("mem-fact", { title: "Bosque", type: "fact", priority: 4 }),
        mkMemory("mem-thread", { title: "Bosque", type: "thread", priority: 4 }),
      ],
      pendingMessage: "Camino hacia el bosque.",
    })

    expect(selectionOf(result, "mem-thread")?.score).toBeGreaterThan(
      selectionOf(result, "mem-fact")?.score ?? 0,
    )
    expect(result.memories.map((memory) => memory.id)).toContain("mem-thread")
  })

  it("keeps a thread eligible at the decay threshold while fact and episode decay", () => {
    const conversation = mkConversation({
      memoryDecayThreshold: 3,
      memoryDecaySpeed: 10,
    })
    const messages = userMessages(10)
    const policy = MemoryDecayPolicy.fromConversation(conversation)

    // Exactly at the threshold: 4 - floor(10 / 10) === 3.
    expect(policy.effectivePriority(4, 10)).toBe(policy.threshold)

    const base = {
      actor: "Marcus",
      title: "Promesa",
      description: "Volverá.",
      priority: 4,
      updatedAt: now,
    }
    const selectType = (type: "thread" | "fact" | "episode") =>
      select({
        conversation,
        messages,
        pendingMessage: "Cae la noche.",
        memories: [mkMemory(`mem-${type}`, { ...base, type })],
      })

    const asThread = selectType("thread")
    const asFact = selectType("fact")
    const asEpisode = selectType("episode")

    expect(selectionOf(asThread, "mem-thread")).toMatchObject({
      included: true,
      reason: "thread",
    })
    expect(selectionOf(asFact, "mem-fact")).toMatchObject({
      included: false,
      reason: "decay",
    })
    expect(selectionOf(asEpisode, "mem-episode")).toMatchObject({
      included: false,
      reason: "decay",
    })
  })

  it("includes a fresh high priority memory even without lexical signal", () => {
    const result = select({
      memories: [mkMemory("mem-priority", { priority: 9 })],
      pendingMessage: "Nada relevante.",
    })

    expect(selectionOf(result, "mem-priority")).toMatchObject({
      included: true,
      reason: "priority",
    })
  })

  it("excludes memories that are not prompt-eligible after decay", () => {
    const result = select({
      memories: [mkMemory("mem-decayed", { priority: 2 })],
      pendingMessage: "Nada relevante.",
    })

    expect(selectionOf(result, "mem-decayed")).toMatchObject({
      included: false,
      reason: "decay",
    })
    expect(result.memories).toEqual([])
  })

  it("keeps a below-threshold memory out even when the actor and a keyword match", () => {
    const result = select({
      memories: [
        mkMemory("mem-decayed-signal", {
          actor: "Lyra",
          title: "Bosque",
          priority: 2,
        }),
      ],
      pendingMessage: "Lyra busca el bosque.",
    })

    expect(selectionOf(result, "mem-decayed-signal")).toMatchObject({
      included: false,
      reason: "decay",
    })
    expect(result.memories).toEqual([])
  })

  it("does not enter by priority when the effective priority is below 8", () => {
    const conversation = mkConversation({
      memoryDecayThreshold: 1,
      memoryDecaySpeed: 10,
    })
    const memories = [
      mkMemory("mem-decaying", { priority: 9, title: "Rutina", actor: "Marcus" }),
    ]
    const messages = userMessages(20)

    const asFact = select({
      conversation,
      memories,
      messages,
      pendingMessage: "Cae la noche.",
    })
    const asThread = select({
      conversation,
      memories: [
        mkMemory("mem-decaying", {
          priority: 9,
          title: "Rutina",
          actor: "Marcus",
          type: "thread",
        }),
      ],
      messages,
      pendingMessage: "Cae la noche.",
    })

    expect(selectionOf(asFact, "mem-decaying")).toMatchObject({
      included: false,
      reason: "not-relevant",
    })
    expect(selectionOf(asThread, "mem-decaying")).toMatchObject({
      included: true,
      reason: "thread",
    })
  })

  it("makes recency decrease with the turns since the update and stop at 50", () => {
    // Priority 10 keeps every fixture above the default decay threshold at the
    // turn counts used here, so the scores still measure recency.
    const fresh = mkMemory("mem-fresh", {
      title: "Bosque",
      priority: 10,
      // Updated after every counted message: zero turns, maximum recency.
      updatedAt: new Date(now.getTime() + 60 * 60_000),
    })
    const tenTurnsOld = mkMemory("mem-old", {
      title: "Bosque",
      priority: 10,
      updatedAt: now,
    })
    const fiftyTurnsOld = mkMemory("mem-50", {
      title: "Bosque",
      priority: 10,
      updatedAt: new Date(now.getTime() - 60 * 60_000),
    })
    const sixtyTurnsOld = mkMemory("mem-60", {
      title: "Bosque",
      priority: 10,
      updatedAt: new Date(now.getTime() - 60 * 60_000),
    })

    const monotonic = select({
      memories: [fresh, tenTurnsOld],
      messages: userMessages(10),
      pendingMessage: "El bosque.",
    })
    expect(selectionOf(monotonic, "mem-fresh")?.score).toBeGreaterThan(
      selectionOf(monotonic, "mem-old")?.score ?? 0,
    )

    const capped = select({
      memories: [fiftyTurnsOld, sixtyTurnsOld],
      messages: userMessages(60),
      pendingMessage: "El bosque.",
    })
    expect(selectionOf(capped, "mem-50")?.score).toBe(
      selectionOf(capped, "mem-60")?.score,
    )
  })

  it("breaks score ties by updatedAt desc and then by id asc", () => {
    const older = mkMemory("mem-older", {
      title: "Bosque",
      updatedAt: new Date(now.getTime() - 120 * 60_000),
    })
    const newer = mkMemory("mem-newer-a", {
      title: "Bosque",
      updatedAt: new Date(now.getTime() - 60 * 60_000),
    })
    const sameTimeB = mkMemory("mem-b", { title: "Bosque", updatedAt: now })
    const sameTimeA = mkMemory("mem-a", { title: "Bosque", updatedAt: now })
    // No turns have elapsed, so both stay decay-eligible: the tie-breakers
    // under test are updatedAt and id, not the decay gate.
    const messages: { role: string; createdAt: Date }[] = []

    const byUpdatedAt = select({
      memories: [older, newer],
      messages,
      pendingMessage: "El bosque.",
    })
    expect(byUpdatedAt.memories.map((memory) => memory.id)).toEqual([
      "mem-newer-a",
      "mem-older",
    ])

    const byId = select({
      memories: [sameTimeB, sameTimeA],
      pendingMessage: "El bosque.",
    })
    expect(byId.memories.map((memory) => memory.id)).toEqual(["mem-a", "mem-b"])
  })

  it("is deterministic across two runs", () => {
    const memories = [
      mkMemory("mem-b", { title: "Bosque" }),
      mkMemory("mem-a", { title: "Bosque" }),
      mkMemory("mem-thread", { type: "thread" }),
    ]

    const first = select({ memories, pendingMessage: "El bosque." })
    const second = select({ memories, pendingMessage: "El bosque." })

    expect(second.selection).toEqual(first.selection)
    expect(second.memories.map((memory) => memory.id)).toEqual(
      first.memories.map((memory) => memory.id),
    )
  })

  it("uses a 512 token budget when the window is unknown", () => {
    const result = select({
      conversation: mkConversation({ contextWindow: null }),
      memories: [mkMemory("mem-1", { priority: 9 })],
    })

    expect(result.budget).toBe(512)
  })

  it("clamps the budget to 256 and 2048", () => {
    const minimum = select({
      conversation: mkConversation({ contextWindow: 400 }),
      memories: [mkMemory("mem-1", { priority: 9 })],
    })
    const maximum = select({
      conversation: mkConversation({ contextWindow: 32_000 }),
      memories: [mkMemory("mem-1", { priority: 9 })],
    })

    expect(minimum.budget).toBe(256)
    expect(maximum.budget).toBe(2048)
  })

  it("cuts by score with reason budget and never exceeds the rendered budget", async () => {
    const conversation = mkConversation({ contextWindow: 400 })
    const memories = Array.from({ length: 40 }, (_, index) =>
      mkMemory(`mem-${String(index).padStart(2, "0")}`, {
        actor: "Lyra",
        title: `Bosque ${String(index).padStart(2, "0")}`,
        description:
          "Una descripción larga de un recuerdo que ocupa bastantes tokens en la sección de memoria renderizada.",
        priority: 8,
      }),
    )

    const result = select({
      conversation,
      memories,
      pendingMessage: "Lyra recuerda el bosque.",
    })

    expect(result.budget).toBe(256)
    expect(result.tokens).toBeLessThanOrEqual(result.budget)
    expect(result.selection.some((entry) => entry.reason === "budget")).toBe(
      true,
    )
    expect(result.memories.length).toBeLessThan(memories.length)
    expect(result.memories.length).toBe(
      result.selection.filter((entry) => entry.included).length,
    )

    const version = CharacterVersion.create({
      id: "ver-1",
      characterId: "char-1",
      name: "Lyra",
      subtitle: null,
      profileImageAssetId: null,
      description: "Guardián",
      instructions: null,
      greeting: "Hola",
      versionNumber: 1,
      createdAt: now,
      cards: [],
    })
    const builder = new PromptContextBuilderImpl()
    const built = await builder.buildWithSections({
      characterVersion: version,
      messages: [],
      recentMessageCount: 0,
      memories: result.memories,
    })
    const section = built.sections.find((item) => item.id === "memories")

    expect(section).toBeDefined()
    expect(estimateTextTokens(section!.content)).toBeLessThanOrEqual(
      result.budget,
    )
    expect(result.tokens).toBeLessThanOrEqual(result.budget)
  })
})

describe("selectMemoriesForPrompt context policy budgets", () => {
  type Policy = "fast" | "balanced" | "deep"

  const policyConversation = (
    policy: Policy,
    overrides: { contextWindow?: number | null } = {},
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
      maxTokens: 2_048,
      compactionThreshold: 80,
      temperature: 0.7,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: [],
      memoryProposalMode: "auto",
      contextPolicy: policy,
      createdAt: now,
      updatedAt: now,
    })

  const longMemories = (count: number): Memory[] =>
    Array.from({ length: count }, (_, index) =>
      mkMemory(`mem-${String(index).padStart(2, "0")}`, {
        actor: "Lyra",
        title: `Bosque ${String(index).padStart(2, "0")}`,
        description:
          "Una descripción larga de un recuerdo que ocupa bastantes tokens en la sección de memoria renderizada.",
        priority: 8,
      }),
    )

  it("uses the memory budget of each policy", () => {
    expect(
      select({ conversation: policyConversation("fast"), memories: [] }).budget,
    ).toBe(480)
    expect(
      select({ conversation: policyConversation("balanced"), memories: [] })
        .budget,
    ).toBe(960)
    expect(
      select({ conversation: policyConversation("deep"), memories: [] }).budget,
    ).toBe(1_440)
  })

  it("clamps the memory budget to each policy min and max", () => {
    expect(
      select({
        conversation: policyConversation("fast", { contextWindow: 32_000 }),
        memories: [],
      }).budget,
    ).toBe(1_024)
    expect(
      select({
        conversation: policyConversation("balanced", { contextWindow: 32_000 }),
        memories: [],
      }).budget,
    ).toBe(2_048)
    expect(
      select({
        conversation: policyConversation("deep", { contextWindow: 32_000 }),
        memories: [],
      }).budget,
    ).toBe(4_096)

    expect(
      select({
        conversation: policyConversation("fast", { contextWindow: 500 }),
        memories: [],
      }).budget,
    ).toBe(128)
    expect(
      select({
        conversation: policyConversation("deep", { contextWindow: 1_000 }),
        memories: [],
      }).budget,
    ).toBe(256)
  })

  it("uses the fallback budget when the window is unknown", () => {
    for (const [policy, fallback] of [
      ["fast", 256],
      ["balanced", 512],
      ["deep", 1_024],
    ] as const) {
      expect(
        select({
          conversation: policyConversation(policy, { contextWindow: null }),
          memories: [],
        }).budget,
      ).toBe(fallback)
    }
  })

  it("includes fewer memories with fast and more with deep, keeping the order", () => {
    const memories = longMemories(40)
    const pendingMessage = "Lyra recuerda el bosque."

    const fast = select({
      conversation: policyConversation("fast"),
      memories,
      pendingMessage,
    })
    const balanced = select({
      conversation: policyConversation("balanced"),
      memories,
      pendingMessage,
    })
    const deep = select({
      conversation: policyConversation("deep"),
      memories,
      pendingMessage,
    })

    const ids = (result: ReturnType<typeof select>) =>
      result.memories.map((memory) => memory.id)

    expect(fast.tokens).toBeLessThanOrEqual(fast.budget)
    expect(balanced.tokens).toBeLessThanOrEqual(balanced.budget)
    expect(deep.tokens).toBeLessThanOrEqual(deep.budget)

    expect(fast.memories.length).toBeLessThan(balanced.memories.length)
    expect(balanced.memories.length).toBeLessThan(deep.memories.length)

    expect(ids(balanced).slice(0, fast.memories.length)).toEqual(ids(fast))
    expect(ids(deep).slice(0, balanced.memories.length)).toEqual(
      ids(balanced),
    )
  })

  it("keeps the deep selection deterministic and ordered by id on ties", () => {
    const memories = longMemories(40)
    const conversation = policyConversation("deep")

    const first = select({
      conversation,
      memories,
      pendingMessage: "Lyra recuerda el bosque.",
    })
    const second = select({
      conversation,
      memories,
      pendingMessage: "Lyra recuerda el bosque.",
    })

    expect(second.selection).toEqual(first.selection)
    const sortedIds = [...first.memories.map((memory) => memory.id)].sort()
    expect(first.memories.map((memory) => memory.id)).toEqual(sortedIds)
  })

  it("does not enable semantic retrieval by itself", () => {
    const memories = longMemories(20)
    const input = {
      conversation: policyConversation("deep"),
      memories,
      messages: [],
      pendingMessage: "Lyra recuerda el bosque.",
      mainActors: [],
    }

    const lexical = selectMemoriesForPrompt(input)
    const withEmptyScores = selectMemoriesForPrompt({
      ...input,
      semanticScores: new Map(),
    })

    expect(withEmptyScores.selection).toEqual(lexical.selection)
    expect(withEmptyScores.memories.map((memory) => memory.id)).toEqual(
      lexical.memories.map((memory) => memory.id),
    )
  })
})
