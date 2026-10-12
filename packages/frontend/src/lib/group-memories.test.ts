import { describe, expect, it } from "vitest"

import type { MemoryDTO } from "@workspace/shared/types/memory"

import { groupMemoriesByActor } from "./group-memories"

const memory = (
  id: string,
  actor: string,
  priority: number,
): MemoryDTO => ({
  id,
  conversationId: "conv-1",
  actor,
  title: id,
  description: "",
  priority,
  createdBy: "assistant",
  updatedBy: "assistant",
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
})

const priorityOf = (item: MemoryDTO) => item.priority

describe("groupMemoriesByActor", () => {
  it("groups memories by actor and sorts them by relevance inside", () => {
    const groups = groupMemoriesByActor(
      [
        memory("low", "Marcus", 2),
        memory("high", "Marcus", 9),
        memory("mid", "Marcus", 5),
      ],
      { priorityOf },
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].actor).toBe("Marcus")
    expect(groups[0].memories.map((item) => item.id)).toEqual([
      "high",
      "mid",
      "low",
    ])
  })

  it("heads the list with the conversation's character", () => {
    const groups = groupMemoriesByActor(
      [
        memory("a", "Marcus", 5),
        memory("b", "Lyra", 1),
        memory("c", "Marcus", 5),
      ],
      { characterName: "Lyra", priorityOf },
    )

    expect(groups.map((group) => group.actor)).toEqual(["Lyra", "Marcus"])
  })

  it("orders by number of memories and then alphabetically", () => {
    const groups = groupMemoriesByActor(
      [
        memory("a", "Zoe", 5),
        memory("b", "Alice", 5),
        memory("c", "Alice", 5),
        memory("d", "Bob", 5),
      ],
      { priorityOf },
    )

    expect(groups.map((group) => group.actor)).toEqual(["Alice", "Bob", "Zoe"])
    expect(groups.map((group) => group.memories.length)).toEqual([2, 1, 1])
  })

  it("returns nothing for an empty list", () => {
    expect(groupMemoriesByActor([], { priorityOf })).toEqual([])
  })
})
