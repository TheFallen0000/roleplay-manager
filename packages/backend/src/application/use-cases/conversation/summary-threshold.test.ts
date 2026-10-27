import { describe, expect, it, vi } from "vitest"

import type { MessageHistoryRepository } from "../../../domain/ports/message.repository"
import { countMessagesSinceSummary } from "./summary-threshold"

const buildHistory = (
  total: number,
  position: number | null,
): MessageHistoryRepository => ({
  findRecentByConversationId: vi.fn(async () => []),
  findAfterPosition: vi.fn(async () => []),
  findPositionById: vi.fn(async () => position),
  findMaxPosition: vi.fn(async () => total - 1),
  countByConversationId: vi.fn(async () => total),
  findUserMessageTimes: vi.fn(async () => []),
  findStatsByConversationIds: vi.fn(async () => []),
})

describe("countMessagesSinceSummary", () => {
  it("counts every message when there is no summary", async () => {
    const result = await countMessagesSinceSummary(
      "conv-1",
      null,
      buildHistory(7, null),
    )
    expect(result).toBe(7)
  })

  it("counts only the messages after the summary boundary", async () => {
    const result = await countMessagesSinceSummary(
      "conv-1",
      "msg-5",
      buildHistory(7, 4),
    )
    expect(result).toBe(2)
  })

  it("falls back to the total when the boundary message is gone", async () => {
    const result = await countMessagesSinceSummary(
      "conv-1",
      "msg-gone",
      buildHistory(7, null),
    )
    expect(result).toBe(7)
  })

  it("never returns a negative count", async () => {
    const result = await countMessagesSinceSummary(
      "conv-1",
      "msg-10",
      buildHistory(3, 10),
    )
    expect(result).toBe(0)
  })
})
