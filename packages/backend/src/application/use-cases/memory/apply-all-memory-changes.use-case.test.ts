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

const buildMemory = (): Memory =>
  Memory.reconstruct({
    id: "mem-1",
    conversationId: "conv-1",
    actor: "Lyra",
    title: "Old title",
    description: "Old description",
    priority: 3,
    createdBy: "user",
    updatedBy: "user",
    createdAt: new Date("2026-10-20T10:00:00.000Z"),
    updatedAt: new Date("2026-10-20T10:00:00.000Z"),
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
    status: "pending",
    createdAt: new Date("2026-10-20T10:00:00.000Z"),
    processedAt: null,
    processedBy: "user",
    ...overrides,
  })

const buildMemoryRepo = (existing: Memory | null = buildMemory()): MemoryRepository => ({
  findById: vi.fn(async () => existing),
  findByConversationId: vi.fn(async () => []),
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

    expect(result).toEqual([])
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

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: "proposal-1",
      conversationId: "conv-1",
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
      priority: 5,
      createdBy: "assistant",
      updatedBy: "system",
      createdAt: "2026-10-26T12:00:00.000Z",
    })
    expect(memoryRepo.create).toHaveBeenCalledTimes(1)
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "system")
  })

  it("applies an UPDATE proposal to the target memory", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo([
      buildProposal({ operation: "UPDATE", targetMemoryId: "mem-1", title: "New title" }),
    ])
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      processedBy: "system",
    })

    expect(result[0]).toMatchObject({
      id: "mem-1",
      title: "New title",
      updatedBy: "system",
      updatedAt: "2026-10-26T12:00:00.000Z",
    })
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "system")
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

    expect(result).toEqual([])
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

    expect(result).toEqual([])
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

    expect(result).toEqual([])
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

    expect(result).toEqual([])
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to auto-apply proposal",
      expect.any(Error),
      { proposalId: "proposal-1" },
    )
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "system")
  })
})
