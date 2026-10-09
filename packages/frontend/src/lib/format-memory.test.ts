import { describe, it, expect } from "vitest"

import { memoryDecayInfo } from "./format-memory"
import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MemoryDTO } from "@workspace/shared/types/memory"

const buildConversation = (
  overrides: Partial<ConversationDetail> = {},
): ConversationDetail => ({
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
  memoryDecayMode: "silent",
  memoryDecayThreshold: 3,
  memoryDecayAgeThreshold: 30,
  memoryDecaySpeed: 10,
  createdAt: "2026-07-31T12:00:00Z",
  updatedAt: "2026-07-31T12:00:00Z",
  ...overrides,
})

const buildMemory = (overrides: Partial<MemoryDTO> = {}): MemoryDTO => ({
  id: "m-1",
  conversationId: "conv-1",
  actor: "Test",
  title: "Memory 1",
  description: "A test memory",
  priority: 5,
  createdBy: "assistant",
  updatedBy: "system",
  createdAt: "2026-07-31T12:00:00Z",
  updatedAt: "2026-07-31T12:00:00Z",
  ...overrides,
})

const buildMessages = (
  count: number,
  role: "user" | "assistant" = "user",
  startOffsetMs = 0,
): { role: string; createdAt: string }[] =>
  Array.from({ length: count }, (_, i) => ({
    role,
    createdAt: new Date(
      new Date("2026-07-31T12:00:00Z").getTime() + startOffsetMs + (i + 1) * 60_000,
    ).toISOString(),
  }))

describe("memoryDecayInfo", () => {
  it("sin mensajes posteriores mantiene la prioridad almacenada y es elegible", () => {
    const info = memoryDecayInfo(buildMemory(), buildConversation(), [])

    expect(info.turns).toBe(0)
    expect(info.effectivePriority).toBe(5)
    expect(info.isPromptEligible).toBe(true)
    expect(info.isDeletionCandidate).toBe(false)
    expect(info.hasDecayed).toBe(false)
  })

  it("decae -1 por cada `decaySpeed` turnos (decaySpeed 1)", () => {
    const conversation = buildConversation({ memoryDecaySpeed: 1 })
    const info = memoryDecayInfo(buildMemory(), conversation, buildMessages(2))

    expect(info.turns).toBe(2)
    expect(info.effectivePriority).toBe(3)
    expect(info.hasDecayed).toBe(true)
  })

  it("no cuenta las respuestas del asistente como turnos", () => {
    const conversation = buildConversation({ memoryDecaySpeed: 1 })
    const info = memoryDecayInfo(
      buildMemory(),
      conversation,
      buildMessages(10, "assistant"),
    )

    expect(info.turns).toBe(0)
    expect(info.effectivePriority).toBe(5)
    expect(info.hasDecayed).toBe(false)
  })

  it("marca como no elegible cuando la prioridad efectiva cae al umbral o por debajo", () => {
    const conversation = buildConversation({ memoryDecayThreshold: 3, memoryDecaySpeed: 1 })
    const memory = buildMemory({ priority: 4 })
    const info = memoryDecayInfo(memory, conversation, buildMessages(1))

    expect(info.effectivePriority).toBe(3)
    expect(info.isPromptEligible).toBe(false)
    expect(info.isDeletionCandidate).toBe(false) // 1 turn < ageThreshold 30
  })

  it("marca como candidata a eliminación solo cuando cumple umbral y antigüedad", () => {
    const conversation = buildConversation({
      memoryDecayThreshold: 3,
      memoryDecayAgeThreshold: 1,
      memoryDecaySpeed: 1,
    })
    const memory = buildMemory({ priority: 4 })
    const info = memoryDecayInfo(memory, conversation, buildMessages(1))

    expect(info.effectivePriority).toBe(3)
    expect(info.isDeletionCandidate).toBe(true)
  })

  it("no cuenta los mensajes anteriores a la última actualización de la memoria", () => {
    const conversation = buildConversation({ memoryDecaySpeed: 1 })
    // The memory was updated after 1 message; only 3 of 4 messages count.
    const memory = buildMemory({ updatedAt: buildMessages(1)[0].createdAt })
    const info = memoryDecayInfo(memory, conversation, buildMessages(4))

    expect(info.turns).toBe(3)
    expect(info.effectivePriority).toBe(2)
  })

  it("la prioridad efectiva nunca baja de 1", () => {
    const conversation = buildConversation({ memoryDecaySpeed: 1 })
    const info = memoryDecayInfo(buildMemory(), conversation, buildMessages(100))

    expect(info.effectivePriority).toBe(1)
  })
})
