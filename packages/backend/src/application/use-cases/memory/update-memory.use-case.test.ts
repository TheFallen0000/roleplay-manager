import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { UpdateMemoryUseCase } from "./update-memory.use-case"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import { Memory } from "../../../domain/entities/memory.entity"
import { NotFoundError } from "../../../domain/errors"

const buildMemory = (): Memory =>
  Memory.reconstruct({
    id: "mem-1",
    conversationId: "conv-1",
    actor: "Lyra",
    title: "Trusts Kael",
    description: "She has started to trust him.",
    priority: 5,
    createdBy: "user",
    updatedBy: "user",
    createdAt: new Date("2026-10-20T10:00:00.000Z"),
    updatedAt: new Date("2026-10-20T10:00:00.000Z"),
  })

const buildRepo = (existing: Memory | null): MemoryRepository => ({
  findById: vi.fn(async () => existing),
  findByConversationId: vi.fn(async () => []),
  create: vi.fn(async (memory: Memory) => memory),
  update: vi.fn(async (memory: Memory) => memory),
  deleteById: vi.fn(async () => {}),
})

describe("UpdateMemoryUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-26T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("updates only the provided fields", async () => {
    const repo = buildRepo(buildMemory())
    const useCase = new UpdateMemoryUseCase(repo)

    const result = await useCase.execute("conv-1", "mem-1", {
      priority: 8,
    })

    expect(result).toMatchObject({
      id: "mem-1",
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
      priority: 8,
      createdBy: "user",
      updatedBy: "user",
      createdAt: "2026-10-20T10:00:00.000Z",
      updatedAt: "2026-10-26T12:00:00.000Z",
    })
    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it("replaces the fields that are provided", async () => {
    const repo = buildRepo(buildMemory())
    const useCase = new UpdateMemoryUseCase(repo)

    const result = await useCase.execute("conv-1", "mem-1", {
      actor: "Kael",
      title: "Distrusts Lyra",
      description: "The truce is over.",
    })

    expect(result).toMatchObject({
      actor: "Kael",
      title: "Distrusts Lyra",
      description: "The truce is over.",
      priority: 5,
    })
  })

  it("throws a 404 NotFoundError when the memory does not exist", async () => {
    const repo = buildRepo(null)
    const useCase = new UpdateMemoryUseCase(repo)

    await expect(
      useCase.execute("conv-1", "missing", { title: "New title" }),
    ).rejects.toMatchObject({
      name: "NotFoundError",
      code: "MEMORY_NOT_FOUND",
      statusCode: 404,
    })
    await expect(
      useCase.execute("conv-1", "missing", { title: "New title" }),
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(repo.update).not.toHaveBeenCalled()
  })
})
