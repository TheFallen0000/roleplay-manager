import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApplyAllMemoryChangesUseCase } from "./apply-all-memory-changes.use-case"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { Memory } from "../../../domain/entities/memory.entity"
import { MemoryChangeProposal } from "../../../domain/entities/memory-change-proposal.entity"

const buildLogger = (): Logger => {
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => logger,
  }
  return logger
}

const buildMemory = (
  overrides: Partial<Parameters<typeof Memory.reconstruct>[0]> = {},
): Memory =>
  Memory.reconstruct({
    id: "mem-1",
    conversationId: "conv-1",
    actor: "Lyra",
    title: "Old title",
    description: "Old description",
    priority: 3,
    type: "fact",
    createdBy: "user",
    updatedBy: "user",
    createdAt: new Date("2026-10-20T10:00:00.000Z"),
    updatedAt: new Date("2026-10-20T10:00:00.000Z"),
    ...overrides,
  })

const buildProposal = (
  overrides: Partial<Parameters<typeof MemoryChangeProposal.reconstruct>[0]> = {},
): MemoryChangeProposal =>
  MemoryChangeProposal.reconstruct({
    id: "proposal-1",
    conversationId: "conv-1",
    operation: "CREATE",
    targetMemoryId: null,
    actor: "Lyra",
    title: "Trusts Kael",
    description: "She has started to trust him.",
    priority: 5,
    type: "fact",
    status: "pending",
    createdAt: new Date("2026-10-20T10:00:00.000Z"),
    processedAt: null,
    processedBy: "user",
    ...overrides,
  })

const buildMemoryRepo = (
  existing: Memory | null = buildMemory(),
  conversationMemories: Memory[] = [],
): MemoryRepository => ({
  findById: vi.fn(async () => existing),
  findByConversationId: vi.fn(async () => conversationMemories),
  create: vi.fn(async (memory: Memory) => memory),
  update: vi.fn(async (memory: Memory) => memory),
  deleteById: vi.fn(async () => {}),
})

const buildProposalRepo = (
  proposals: MemoryChangeProposal[],
): MemoryChangeProposalRepository => ({
  create: vi.fn(async (item) => item),
  createMany: vi.fn(async () => {}),
  findById: vi.fn(async () => null),
  findPendingByConversationId: vi.fn(async () => proposals),
  findByConversationId: vi.fn(async () => proposals),
  update: vi.fn(async (item) => item),
  markProcessed: vi.fn(async () => {}),
  discardPendingByConversationId: vi.fn(async () => {}),
})

describe("ApplyAllMemoryChangesUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-26T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const buildUseCase = (
    memoryRepo: MemoryRepository,
    proposalRepo: MemoryChangeProposalRepository,
    logger = buildLogger(),
  ) => ({ useCase: new ApplyAllMemoryChangesUseCase(memoryRepo, proposalRepo, logger), logger })

  it("returns an empty list without touching proposals when there are none", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo([])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 0,
    })
    expect(proposalRepo.markProcessed).not.toHaveBeenCalled()
    expect(memoryRepo.create).not.toHaveBeenCalled()
  })

  it("applies a CREATE proposal with the assistant as author", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo([buildProposal()])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result.memories).toHaveLength(1)
    expect(result.memories[0]).toMatchObject({
      id: "proposal-1",
      conversationId: "conv-1",
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
      priority: 5,
      type: "fact",
      createdBy: "assistant",
      updatedBy: "system",
      createdAt: "2026-10-26T12:00:00.000Z",
    })
    expect(result).toMatchObject({ created: 1, updated: 0, discarded: 0 })
    expect(memoryRepo.create).toHaveBeenCalledTimes(1)
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "system")
  })

  it("applies an UPDATE proposal to the target memory", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo([
      buildProposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        title: "New title",
        type: "thread",
      }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result.memories[0]).toMatchObject({
      id: "mem-1",
      title: "New title",
      type: "thread",
      updatedBy: "system",
      updatedAt: "2026-10-26T12:00:00.000Z",
    })
    expect(result).toMatchObject({ created: 0, updated: 1, discarded: 0 })
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "system")
  })

  it("consolidates a CREATE with the same normalized actor and title as an UPDATE", async () => {
    const existing = buildMemory({ title: "Misión" })
    const memoryRepo = buildMemoryRepo(existing, [existing])
    const proposalRepo = buildProposalRepo([
      buildProposal({
        actor: "Lyra",
        title: "mision",
        description: "Ahora protege el río.",
        type: "thread",
      }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(memoryRepo.create).not.toHaveBeenCalled()
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)
    const updated = vi.mocked(memoryRepo.update).mock.calls[0]![0]
    expect(updated.id).toBe("mem-1")
    expect(updated.title).toBe("Misión")
    expect(updated.description).toBe("Ahora protege el río.")
    expect(updated.type).toBe("thread")
    expect(result.memories[0]).toMatchObject({
      id: "mem-1",
      title: "Misión",
      type: "thread",
    })
    expect(result).toMatchObject({ created: 0, updated: 1, discarded: 0 })
  })

  it("consolidates only with the memory of the same actor", async () => {
    const lyra = buildMemory({ id: "mem-lyra", actor: "Lyra", title: "Misión" })
    const kael = buildMemory({ id: "mem-kael", actor: "Kael", title: "Misión" })
    const memoryRepo = buildMemoryRepo(kael, [lyra, kael])
    const proposalRepo = buildProposalRepo([
      buildProposal({ actor: "Kael", title: "Misión", description: "Nueva" }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(memoryRepo.create).not.toHaveBeenCalled()
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)
    expect(vi.mocked(memoryRepo.update).mock.calls[0]![0].id).toBe("mem-kael")
    expect(result.memories[0].id).toBe("mem-kael")
    expect(result).toMatchObject({ created: 0, updated: 1, discarded: 0 })
  })

  it("aggregates created, updated and discarded counts", async () => {
    const existing = buildMemory({ title: "Misión" })
    const memoryRepo = buildMemoryRepo(existing, [existing])
    const proposalRepo = buildProposalRepo([
      buildProposal({
        id: "proposal-same",
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        actor: "Lyra",
        title: "Misión",
        description: "Old description",
        priority: 3,
      }),
      buildProposal({
        id: "proposal-new",
        actor: "Lyra",
        title: "Nueva memoria",
        description: "Un hecho nuevo.",
      }),
      buildProposal({
        id: "proposal-duplicate",
        actor: "Lyra",
        title: "mision",
        description: "Actualiza la existente.",
        type: "thread",
      }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(memoryRepo.create).toHaveBeenCalledTimes(1)
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)
    expect(result.memories).toHaveLength(2)
    expect(result).toMatchObject({
      created: 1,
      updated: 1,
      discarded: 1,
    })
  })

  it("discards an UPDATE proposal that does not change the memory", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo([
      buildProposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        actor: "Lyra",
        title: "Old title",
        description: "Old description",
        priority: 3,
      }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(memoryRepo.update).not.toHaveBeenCalled()
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith(
      "proposal-1",
      "discarded",
      "system",
    )
  })

  it("discards an UPDATE proposal whose target memory is missing", async () => {
    const memoryRepo = buildMemoryRepo(null)
    const proposalRepo = buildProposalRepo([
      buildProposal({ operation: "UPDATE", targetMemoryId: "missing" }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(memoryRepo.update).not.toHaveBeenCalled()
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "system")
  })

  it("applies a DELETE proposal", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo([
      buildProposal({ operation: "DELETE", targetMemoryId: "mem-1" }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 0,
    })
    expect(memoryRepo.deleteById).toHaveBeenCalledWith("mem-1")
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "system")
  })

  it("discards a proposal without a target memory id", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo([
      buildProposal({ operation: "DELETE", targetMemoryId: null }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(memoryRepo.deleteById).not.toHaveBeenCalled()
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "system")
  })

  it("marks a proposal discarded and logs when the operation fails", async () => {
    const memoryRepo = buildMemoryRepo()
    vi.mocked(memoryRepo.create).mockRejectedValueOnce(new Error("database down"))
    const proposalRepo = buildProposalRepo([buildProposal()])
    const { useCase, logger } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to auto-apply proposal",
      expect.any(Error),
      { proposalId: "proposal-1" },
    )
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "system")
  })
})
