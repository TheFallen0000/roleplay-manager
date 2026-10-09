import { describe, it, expect } from "vitest"

import { filterMemoriesForPrompt } from "./memory-decay"
import { Conversation } from "../domain/entities/conversation.entity"
import { Memory } from "../domain/entities/memory.entity"
import { Message } from "../domain/entities/message.entity"

const now = new Date("2026-07-31T12:00:00Z")

const buildConversation = (overrides: Partial<Parameters<typeof Conversation.create>[0]> = {}) =>
  Conversation.create({
    id: "conv-1",
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: null,
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 10,
    summaryFrequency: 20,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })

const buildMemory = (id: string, priority: number, updatedAt: Date): Memory =>
  Memory.create({
    id,
    conversationId: "conv-1",
    actor: "Test",
    title: `Memory ${id}`,
    description: "A test memory",
    priority,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: updatedAt,
    updatedAt,
  })

const buildTimeline = (
  count: number,
  role: "user" | "assistant" = "user",
  startOffsetMs: number = 0,
): Message[] =>
  Array.from({ length: count }, (_, i) =>
    Message.create({
      id: `msg-${i}`,
      conversationId: "conv-1",
      role,
      content: `Message ${i}`,
      position: i,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: new Date(now.getTime() + startOffsetMs + (i + 1) * 60_000),
      editedAt: null,
    }),
  )

describe("filterMemoriesForPrompt", () => {
  it("excluye las memorias cuya prioridad efectiva cayó al umbral o por debajo", () => {
    // decaySpeed 1, threshold 3: the priority-5 memory drops to 3 after 2 turns.
    const conversation = buildConversation({
      memoryDecayThreshold: 3,
      memoryDecaySpeed: 1,
    })
    const oldMemory = buildMemory("m-old", 5, new Date(now.getTime() - 60_000))
    const freshMemory = buildMemory("m-fresh", 5, new Date(now.getTime() + 60_000))

    const result = filterMemoriesForPrompt(
      conversation,
      [oldMemory, freshMemory],
      buildTimeline(2),
    )

    expect(result.map((m) => m.id)).toEqual(["m-fresh"])
  })

  it("mantiene todas las memorias si la velocidad de degradación es lenta", () => {
    const conversation = buildConversation({
      memoryDecayThreshold: 3,
      memoryDecaySpeed: 100,
    })
    const memory = buildMemory("m-high", 5, new Date(now.getTime() - 60_000))

    const result = filterMemoriesForPrompt(
      conversation,
      [memory],
      buildTimeline(35),
    )

    expect(result.map((m) => m.id)).toEqual(["m-high"])
  })

  it("no cuenta los mensajes anteriores al último update de la memoria", () => {
    const conversation = buildConversation({
      memoryDecayThreshold: 3,
      memoryDecaySpeed: 1,
    })
    // The memory was updated after 1 message; only 3 of the 4 total count.
    const memory = buildMemory("m-recent", 5, new Date(now.getTime() + 60_000))

    const result = filterMemoriesForPrompt(
      conversation,
      [memory],
      buildTimeline(4, "user", 0),
    )

    // 4 messages, 3 after the update → 5-3 = 2 ≤ 3 → excluded.
    expect(result).toEqual([])
  })

  it("el filtrado se aplica también en modo manual y off", () => {
    for (const mode of ["manual", "off"] as const) {
      const conversation = buildConversation({
        memoryDecayMode: mode,
        memoryDecayThreshold: 3,
        memoryDecaySpeed: 1,
      })
      const oldMemory = buildMemory("m-old", 5, new Date(now.getTime() - 60_000))

      const result = filterMemoriesForPrompt(
        conversation,
        [oldMemory],
        buildTimeline(2),
      )

      expect(result).toEqual([])
    }
  })

  it("no cuenta las respuestas del asistente como turnos", () => {
    const conversation = buildConversation({
      memoryDecayThreshold: 3,
      memoryDecaySpeed: 1,
    })
    const memory = buildMemory("m-old", 5, new Date(now.getTime() - 60_000))
    const assistantReplies = buildTimeline(10, "assistant")

    const result = filterMemoriesForPrompt(conversation, [memory], assistantReplies)

    // 0 user turns → effective priority 5 → still eligible.
    expect(result.map((m) => m.id)).toEqual(["m-old"])
  })

  it("devuelve lista vacía sin memorias o sin mensajes", () => {
    const conversation = buildConversation()

    expect(filterMemoriesForPrompt(conversation, [], buildTimeline(2))).toEqual([])
    expect(filterMemoriesForPrompt(conversation, [buildMemory("m-1", 5, now)], [])).toEqual([
      expect.objectContaining({ id: "m-1" }),
    ])
  })
})
