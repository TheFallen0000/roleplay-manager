import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CreateMemoryUseCase } from "./create-memory.use-case"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { Memory } from "../../../domain/entities/memory.entity"

const buildRepo = (): MemoryRepository => ({
  findById: vi.fn(async () => null),
  findByConversationId: vi.fn(async () => []),
  create: vi.fn(async (memory: Memory) => memory),
  update: vi.fn(async (memory: Memory) => memory),
  deleteById: vi.fn(async () => {}),
})

describe("CreateMemoryUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-26T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("creates a user memory with priority 5 by default", async () => {
    const repo = buildRepo()
    const useCase = new CreateMemoryUseCase(repo)

    const result = await useCase.execute("conv-1", {
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
    })

    expect(result).toMatchObject({
      conversationId: "conv-1",
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
      priority: 5,
      createdBy: "user",
      updatedBy: "user",
      createdAt: "2026-10-26T12:00:00.000Z",
      updatedAt: "2026-10-26T12:00:00.000Z",
    })
    expect(result.id).toEqual(expect.any(String))
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it("respects an explicit priority", async () => {
    const repo = buildRepo()
    const useCase = new CreateMemoryUseCase(repo)

    const result = await useCase.execute("conv-1", {
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
      priority: 9,
    })

    expect(result.priority).toBe(9)
  })

  it("passes the entity to the repository before returning the DTO", async () => {
    const repo = buildRepo()
    const useCase = new CreateMemoryUseCase(repo)

    await useCase.execute("conv-1", {
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
    })

    const created = vi.mocked(repo.create).mock.calls[0]![0]
    expect(created).toMatchObject({
      conversationId: "conv-1",
      actor: "Lyra",
      title: "Trusts Kael",
      priority: 5,
    })
  })
})
