import type {
  MemoryDTO,
  CreateMemoryInput,
  UpdateMemoryInput,
  ApplyMemoryChangesResult,
  DecayMemoriesResultDTO,
} from "@workspace/shared/types/memory"
import type {
  MemoryChangeProposalDTO,
  ApplyProposalDecision,
} from "@workspace/shared/types/memory-change-proposal"

import { apiRequest } from "./client"

export const listMemories = (conversationId: string): Promise<MemoryDTO[]> =>
  apiRequest(`/api/conversations/${conversationId}/memories`)

export const createMemory = (
  conversationId: string,
  input: CreateMemoryInput,
): Promise<MemoryDTO> =>
  apiRequest(`/api/conversations/${conversationId}/memories`, {
    method: "POST",
    body: JSON.stringify(input),
  })

export const updateMemory = (
  conversationId: string,
  memoryId: string,
  input: UpdateMemoryInput,
): Promise<MemoryDTO> =>
  apiRequest(`/api/conversations/${conversationId}/memories/${memoryId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const deleteMemory = (
  conversationId: string,
  memoryId: string,
): Promise<void> =>
  apiRequest(`/api/conversations/${conversationId}/memories/${memoryId}`, {
    method: "DELETE",
  })

export const listProposals = (
  conversationId: string,
): Promise<MemoryChangeProposalDTO[]> =>
  apiRequest(`/api/conversations/${conversationId}/memories/proposals`)

export const applyProposals = (
  conversationId: string,
  decisions: ApplyProposalDecision[],
): Promise<ApplyMemoryChangesResult> =>
  apiRequest(`/api/conversations/${conversationId}/memories/proposals/apply`, {
    method: "POST",
    body: JSON.stringify({ decisions }),
  })

export const applyAllProposals = (
  conversationId: string,
): Promise<ApplyMemoryChangesResult> =>
  apiRequest(
    `/api/conversations/${conversationId}/memories/proposals/apply-all`,
    { method: "POST" },
  )

export const decayConversationMemories = (
  conversationId: string,
): Promise<DecayMemoriesResultDTO> =>
  apiRequest(`/api/conversations/${conversationId}/memories/decay`, {
    method: "POST",
  })
