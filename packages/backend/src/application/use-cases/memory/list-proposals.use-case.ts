import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { MemoryChangeProposalDTO } from "@workspace/shared/types/memory-change-proposal"
import type { MemoryChangeProposal } from "../../../domain/entities/memory-change-proposal.entity"

export class ListProposalsUseCase {
  constructor(
    private readonly memoryChangeProposalRepository: MemoryChangeProposalRepository,
  ) {}

  async execute(conversationId: string): Promise<MemoryChangeProposalDTO[]> {
    const proposals = await this.memoryChangeProposalRepository.findByConversationId(conversationId)
    return proposals.map(toProposalDTO)
  }
}

function toProposalDTO(p: MemoryChangeProposal): MemoryChangeProposalDTO {
  return {
    id: p.id,
    conversationId: p.conversationId,
    operation: p.operation,
    targetMemoryId: p.targetMemoryId,
    actor: p.actor,
    title: p.title,
    description: p.description,
    priority: p.priority,
    type: p.type,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    processedAt: p.processedAt?.toISOString() ?? null,
    processedBy: p.processedBy,
  }
}
