import { describe, expect, it } from "vitest"

import type { MessageDTO } from "@workspace/shared/types/message"
import type { SummaryDTO } from "@workspace/shared/types/summary"

import { countAffectedSummaries } from "./count-affected-summaries"

const message = (id: string, position: number, role: "user" | "assistant"): MessageDTO => ({
  id,
  conversationId: "conv-1",
  role,
  content: id,
  position,
  alternatives: [],
  alternativesCursor: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  editedAt: null,
})

const summary = (id: string, firstMessageId: string, lastMessageId: string): SummaryDTO => ({
  id,
  conversationId: "conv-1",
  content: "",
  firstMessageId,
  lastMessageId,
  model: null,
  provider: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  editedAt: null,
})

describe("countAffectedSummaries", () => {
  const messages = [
    message("m1", 1, "user"),
    message("m2", 2, "assistant"),
    message("m3", 3, "user"),
    message("m4", 4, "assistant"),
  ]

  it("counts summaries that touch a deleted message", () => {
    const summaries = [
      summary("s1", "m1", "m2"),
      summary("s2", "m2", "m3"),
      summary("s3", "m1", "m1"),
    ]

    expect(countAffectedSummaries(messages, "m2", summaries)).toBe(1)
  })

  it("includes the target when rewinding to a user message", () => {
    const summaries = [summary("s1", "m2", "m3")]

    expect(countAffectedSummaries(messages, "m3", summaries)).toBe(1)
  })

  it("returns zero for an unknown target", () => {
    expect(countAffectedSummaries(messages, "missing", [])).toBe(0)
  })
})
