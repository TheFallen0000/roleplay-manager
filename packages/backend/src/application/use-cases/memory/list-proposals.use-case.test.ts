import { describe, expect, it, vi } from "vitest"

import { ListProposalsUseCase } from "./list-proposals.use-case"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import { MemoryChangeProposal } from "../../../domain/entities/memory-change-proposal.entity"

const buildRepo = (
  proposals: MemoryChangeProposal[],
): MemoryChangeProposalRepository => ({
  create: vi.fn(async (proposal) => proposal),
  createMany: vi.fn(async () => {}),
  findById: vi.fn(async () => null),
  findPendingByConversationId: vi.fn(async () => []),
  findByConversationId: vi.fn(async () => proposals),
  update: vi.fn(async (proposal) => proposal),
  markProcessed: vi.fn(async () => {}),
  discardPendingByConversationId: vi.fn(async () => {}),
})

const proposal = (
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

describe("ListProposalsUseCase", () => {
  it("returns an empty list when there are no proposals", async () => {
    const useCase = new ListProposalsUseCase(buildRepo([]))

    await expect(useCase.execute("conv-1")).resolves.toEqual([])
  })

  it("maps pending proposals to DTOs", async () => {
    const useCase = new ListProposalsUseCase(buildRepo([proposal()]))

    const result = await useCase.execute("conv-1")

    expect(result).toEqual([
      {
        id: "proposal-1",
        conversationId: "conv-1",
        operation: "CREATE",
        targetMemoryId: null,
        actor: "Lyra",
        title: "Trusts Kael",
        description: "She has started to trust him.",
        priority: 5,
        status: "pending",
        createdAt: "2026-10-20T10:00:00.000Z",
        processedAt: null,
        processedBy: "user",
      },
    ])
  })

  it("serializes processed proposals and keeps their target memory id", async () => {
    const useCase = new ListProposalsUseCase(
      buildRepo([
        proposal({
          operation: "UPDATE",
          targetMemoryId: "mem-1",
          status: "applied",
          processedAt: new Date("2026-10-21T12:00:00.000Z"),
          processedBy: "system",
        }),
      ]),
    )

    const result = await useCase.execute("conv-1")

    expect(result[0]).toMatchObject({
      operation: "UPDATE",
      targetMemoryId: "mem-1",
      status: "applied",
      processedAt: "2026-10-21T12:00:00.000Z",
      processedBy: "system",
    })
  })
})
