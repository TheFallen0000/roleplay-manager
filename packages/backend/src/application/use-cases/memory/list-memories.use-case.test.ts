import { describe, expect, it, vi } from "vitest"

import { ListMemoriesUseCase } from "./list-memories.use-case"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import { Memory } from "../../../domain/entities/memory.entity"

const buildRepo = (memories: Memory[]): MemoryRepository => ({
  findById: vi.fn(async () => null),
  findByConversationId: vi.fn(async () => memories),
  create: vi.fn(async (memory: Memory) => memory),
  update: vi.fn(async (memory: Memory) => memory),
  deleteById: vi.fn(async () => {}),
})

const memory = (id: string, priority: number): Memory =>
  Memory.reconstruct({
    id,
    conversationId: "conv-1",
    actor: "Lyra",
    title: `Memory ${id}`,
    description: "A memory.",
    priority,
    createdBy: "user",
    updatedBy: "user",
    createdAt: new Date("2026-10-20T10:00:00.000Z"),
    updatedAt: new Date("2026-10-21T11:00:00.000Z"),
  })

describe("ListMemoriesUseCase", () => {
  it("returns an empty list when the conversation has no memories", async () => {
    const useCase = new ListMemoriesUseCase(buildRepo([]))

    await expect(useCase.execute("conv-1")).resolves.toEqual([])
  })

  it("maps memories to DTOs and preserves their order", async () => {
    const useCase = new ListMemoriesUseCase(
      buildRepo([memory("mem-1", 5), memory("mem-2", 8)]),
    )

    const result = await useCase.execute("conv-1")

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.id)).toEqual(["mem-1", "mem-2"])
    expect(result[1]).toEqual({
      id: "mem-2",
      conversationId: "conv-1",
      actor: "Lyra",
      title: "Memory mem-2",
      description: "A memory.",
      priority: 8,
      createdBy: "user",
      updatedBy: "user",
      createdAt: "2026-10-20T10:00:00.000Z",
      updatedAt: "2026-10-21T11:00:00.000Z",
    })
  })
})
