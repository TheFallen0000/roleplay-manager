import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { MemoryType } from "@workspace/shared/types/memory"

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
      type: "fact",
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

  it("respects an explicit type and passes it to the repository", async () => {
    const repo = buildRepo()
    const useCase = new CreateMemoryUseCase(repo)
    const type: MemoryType = "thread"

    const result = await useCase.execute("conv-1", {
      actor: "Lyra",
      title: "Promesa a Kael",
      description: "Prometió volver antes del invierno.",
      type,
    })

    expect(result.type).toBe("thread")
    const created = vi.mocked(repo.create).mock.calls[0]![0]
    expect(created.type).toBe("thread")
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
