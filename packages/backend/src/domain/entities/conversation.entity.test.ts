import { describe, expect, it } from "vitest"

import {
  Conversation,
  type ConversationProps,
} from "./conversation.entity"

const now = new Date("2026-11-28T12:00:00.000Z")

const props = (overrides: Partial<ConversationProps> = {}): ConversationProps => ({
  id: "conv-1",
  versionId: "ver-1",
  title: null,
  titleSource: null,
  model: "llama3",
  provider: "ollama",
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  contextWindow: 8_000,
  temperature: 0.7,
  maxTokens: 2_048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  createdAt: now,
  updatedAt: now,
  ...overrides,
})

describe("Conversation context policy", () => {
  it("defaults to balanced when create receives no policy", () => {
    const conversation = Conversation.create(props())

    expect(conversation.contextPolicy).toBe("balanced")
  })

  it("keeps a valid policy", () => {
    expect(
      Conversation.create(props({ contextPolicy: "deep" })).contextPolicy,
    ).toBe("deep")
    expect(
      Conversation.create(props({ contextPolicy: "fast" })).contextPolicy,
    ).toBe("fast")
  })

  it("normalizes an invalid policy to balanced on create", () => {
    expect(
      Conversation.create(props({ contextPolicy: "Deep" as never }))
        .contextPolicy,
    ).toBe("balanced")
    expect(
      Conversation.create(props({ contextPolicy: "turbo" as never }))
        .contextPolicy,
    ).toBe("balanced")
  })

  it("normalizes the policy in withContextPolicy", () => {
    const conversation = Conversation.create(props())

    const deep = conversation.withContextPolicy("deep")
    expect(deep.contextPolicy).toBe("deep")
    expect(deep.id).toBe(conversation.id)

    const invalid = conversation.withContextPolicy("Deep" as never)
    expect(invalid.contextPolicy).toBe("balanced")
  })

  it("does not reset the stored compaction threshold when the policy changes", () => {
    const conversation = Conversation.create(
      props({ compactionThreshold: 85 }),
    )

    const changed = conversation.withContextPolicy("deep")

    expect(changed.compactionThreshold).toBe(85)
  })
})
