import { describe, expect, it } from "vitest"

import type { MemoryType } from "@workspace/shared/types/memory"

import { Memory } from "./memory.entity"

const now = new Date("2026-11-21T12:00:00.000Z")

const baseProps = {
  id: "mem-1",
  conversationId: "conv-1",
  actor: "Lyra",
  title: "Misión",
  description: "Debe proteger el bosque.",
  priority: 7,
  createdBy: "assistant" as const,
  updatedBy: "system" as const,
  createdAt: now,
  updatedAt: now,
}

describe("Memory type", () => {
  it("defaults to fact when the type is omitted", () => {
    const memory = Memory.create(baseProps)

    expect(memory.type).toBe("fact")
  })

  it("keeps an explicit episode or thread", () => {
    const episode = Memory.create({ ...baseProps, type: "episode" })
    const thread = Memory.reconstruct({ ...baseProps, type: "thread" })

    expect(episode.type).toBe("episode")
    expect(thread.type).toBe("thread")
  })

  it("rejects a type outside the supported values", () => {
    expect(() =>
      Memory.create({ ...baseProps, type: "legend" as MemoryType }),
    ).toThrow(/type/i)
  })

  it("changes the type through update and keeps it when omitted", () => {
    const memory = Memory.create(baseProps)

    const updated = memory.update({ type: "thread" }, "user")
    const untouched = updated.update({ title: "Otra misión" }, "user")

    expect(updated.type).toBe("thread")
    expect(untouched.type).toBe("thread")
  })
})
