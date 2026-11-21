import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApplyMemoryChangesUseCase } from "./apply-memory-changes.use-case"
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
  proposal: MemoryChangeProposal | null,
): MemoryChangeProposalRepository => ({
  create: vi.fn(async (item) => item),
  createMany: vi.fn(async () => {}),
  findById: vi.fn(async () => proposal),
  findPendingByConversationId: vi.fn(async () => []),
  findByConversationId: vi.fn(async () => []),
  update: vi.fn(async (item) => item),
  markProcessed: vi.fn(async () => {}),
  discardPendingByConversationId: vi.fn(async () => {}),
})

describe("ApplyMemoryChangesUseCase", () => {
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
  ) => ({ useCase: new ApplyMemoryChangesUseCase(memoryRepo, proposalRepo, logger), logger })

  it("applies a CREATE proposal and marks it as processed", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(buildProposal())
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(result.memories).toHaveLength(1)
    expect(result.memories[0]).toMatchObject({
      conversationId: "conv-1",
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
      priority: 5,
      type: "fact",
      createdBy: "user",
      updatedBy: "user",
      createdAt: "2026-10-26T12:00:00.000Z",
    })
    expect(result).toMatchObject({ created: 1, updated: 0, discarded: 0 })
    expect(memoryRepo.create).toHaveBeenCalledTimes(1)
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "user")
  })

  it("applies overrides to a CREATE proposal", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(buildProposal())
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [
        {
          proposalId: "proposal-1",
          action: "apply",
          overrides: {
            actor: "Kael",
            title: "Overridden title",
            priority: 9,
          },
        },
      ],
    })

    expect(result.memories[0]).toMatchObject({
      actor: "Kael",
      title: "Overridden title",
      description: "She has started to trust him.",
      priority: 9,
    })
    expect(result).toMatchObject({ created: 1, updated: 0, discarded: 0 })
  })

  it("applies an UPDATE proposal to the target memory", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(
      buildProposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        actor: "Kael",
        title: "New title",
        type: "thread",
      }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(memoryRepo.findById).toHaveBeenCalledWith("mem-1")
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)
    expect(result.memories[0]).toMatchObject({
      id: "mem-1",
      actor: "Kael",
      title: "New title",
      type: "thread",
      updatedBy: "user",
      updatedAt: "2026-10-26T12:00:00.000Z",
    })
    expect(result).toMatchObject({ created: 0, updated: 1, discarded: 0 })
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "user")
  })

  it("consolidates a CREATE with the same normalized actor and title as an UPDATE", async () => {
    const existing = buildMemory({ title: "Misión" })
    const memoryRepo = buildMemoryRepo(existing, [existing])
    const proposalRepo = buildProposalRepo(
      buildProposal({
        actor: "Lyra",
        title: "mision",
        description: "Ahora protege el río.",
        type: "thread",
      }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(memoryRepo.create).not.toHaveBeenCalled()
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)

    const updated = vi.mocked(memoryRepo.update).mock.calls[0]![0]
    expect(updated.id).toBe("mem-1")
    expect(updated.actor).toBe("Lyra")
    // The stored text keeps its original casing; only the edited fields change.
    expect(updated.title).toBe("Misión")
    expect(updated.description).toBe("Ahora protege el río.")
    expect(updated.type).toBe("thread")

    expect(result.memories).toHaveLength(1)
    expect(result.memories[0]).toMatchObject({
      id: "mem-1",
      title: "Misión",
      description: "Ahora protege el río.",
      type: "thread",
    })
    expect(result).toMatchObject({ created: 0, updated: 1, discarded: 0 })
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "user")
  })

  it("consolidates only with the memory of the same actor", async () => {
    const lyra = buildMemory({ id: "mem-lyra", actor: "Lyra", title: "Misión" })
    const kael = buildMemory({ id: "mem-kael", actor: "Kael", title: "Misión" })
    const memoryRepo = buildMemoryRepo(null, [lyra, kael])
    const proposalRepo = buildProposalRepo(
      buildProposal({ actor: "Kael", title: "Misión", description: "Nueva" }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(memoryRepo.create).not.toHaveBeenCalled()
    expect(memoryRepo.update).toHaveBeenCalledTimes(1)
    const updated = vi.mocked(memoryRepo.update).mock.calls[0]![0]
    expect(updated.id).toBe("mem-kael")
    expect(updated.actor).toBe("Kael")
    expect(updated.description).toBe("Nueva")
    expect(result.memories[0].id).toBe("mem-kael")
    expect(result).toMatchObject({ created: 0, updated: 1, discarded: 0 })
  })

  it("discards an UPDATE proposal that does not change the memory", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(
      buildProposal({
        operation: "UPDATE",
        targetMemoryId: "mem-1",
        actor: "Lyra",
        title: "Old title",
        description: "Old description",
        priority: 3,
      }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
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
      "user",
    )
  })

  it("discards an UPDATE proposal when the target memory is missing", async () => {
    const memoryRepo = buildMemoryRepo(null)
    const proposalRepo = buildProposalRepo(
      buildProposal({ operation: "UPDATE", targetMemoryId: "missing" }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(memoryRepo.update).not.toHaveBeenCalled()
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "user")
  })

  it("discards an UPDATE proposal without a target memory id", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(
      buildProposal({ operation: "UPDATE", targetMemoryId: null }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(memoryRepo.findById).not.toHaveBeenCalled()
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "user")
  })

  it("applies a DELETE proposal", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(
      buildProposal({ operation: "DELETE", targetMemoryId: "mem-1" }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 0,
    })
    expect(memoryRepo.deleteById).toHaveBeenCalledWith("mem-1")
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "applied", "user")
  })

  it("discards a DELETE proposal without a target memory id", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(
      buildProposal({ operation: "DELETE", targetMemoryId: null }),
    )
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(memoryRepo.deleteById).not.toHaveBeenCalled()
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "user")
  })

  it("marks a discarded decision without touching memories", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(buildProposal())
    const { useCase } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "discard" }],
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 1,
    })
    expect(memoryRepo.create).not.toHaveBeenCalled()
    expect(memoryRepo.update).not.toHaveBeenCalled()
    expect(memoryRepo.deleteById).not.toHaveBeenCalled()
    expect(proposalRepo.markProcessed).toHaveBeenCalledWith("proposal-1", "discarded", "user")
  })

  it("warns and skips a proposal that no longer exists", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(null)
    const { useCase, logger } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "missing", action: "apply" }],
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 0,
    })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("not found"))
    expect(proposalRepo.markProcessed).not.toHaveBeenCalled()
  })

  it("warns and skips a proposal that was already processed", async () => {
    const memoryRepo = buildMemoryRepo()
    const proposalRepo = buildProposalRepo(
      buildProposal({ status: "applied", processedAt: new Date() }),
    )
    const { useCase, logger } = buildUseCase(memoryRepo, proposalRepo)

    const result = await useCase.execute({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })

    expect(result).toEqual({
      memories: [],
      created: 0,
      updated: 0,
      discarded: 0,
    })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("already applied"))
    expect(proposalRepo.markProcessed).not.toHaveBeenCalled()
  })
})
