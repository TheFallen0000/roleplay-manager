import { create } from "zustand"
import type {
  MemoryDTO,
  CreateMemoryInput,
  UpdateMemoryInput,
} from "@workspace/shared/types/memory"
import type { MemoryChangeProposalDTO, ApplyProposalDecision } from "@workspace/shared/types/memory-change-proposal"

import * as memoriesApi from "@/lib/api/memories"

export interface LastDecayInfo {
  deleted: number
  at: string
}

export interface MemoryState {
  memories: MemoryDTO[]
  proposals: MemoryChangeProposalDTO[]
  loading: boolean
  error: string | null
  lastDecay: LastDecayInfo | null

  loadMemories: (conversationId: string) => Promise<void>
  loadProposals: (conversationId: string) => Promise<void>
  createMemory: (conversationId: string, input: CreateMemoryInput) => Promise<MemoryDTO>
  updateMemory: (conversationId: string, memoryId: string, input: UpdateMemoryInput) => Promise<MemoryDTO>
  deleteMemory: (conversationId: string, memoryId: string) => Promise<void>
  applyProposals: (conversationId: string, decisions: ApplyProposalDecision[]) => Promise<MemoryDTO[]>
  applyAllProposals: (conversationId: string) => Promise<MemoryDTO[]>
  runDecay: (conversationId: string) => Promise<{ deleted: number }>
  reset: () => void
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [],
  proposals: [],
  loading: false,
  error: null,
  lastDecay: null,

  loadMemories: async (conversationId) => {
    set({ loading: true, error: null })
    try {
      const memories = await memoriesApi.listMemories(conversationId)
      set({ memories, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  loadProposals: async (conversationId) => {
    try {
      const proposals = await memoriesApi.listProposals(conversationId)
      set({ proposals })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  createMemory: async (conversationId, input) => {
    const memory = await memoriesApi.createMemory(conversationId, input)
    set((state) => ({ memories: [...state.memories, memory] }))
    return memory
  },

  updateMemory: async (conversationId, memoryId, input) => {
    const memory = await memoriesApi.updateMemory(conversationId, memoryId, input)
    set((state) => ({
      memories: state.memories.map((m) => (m.id === memoryId ? memory : m)),
    }))
    return memory
  },

  deleteMemory: async (conversationId, memoryId) => {
    await memoriesApi.deleteMemory(conversationId, memoryId)
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== memoryId),
    }))
  },

  applyProposals: async (conversationId, decisions) => {
    const result = await memoriesApi.applyProposals(conversationId, decisions)
    const processedIds = decisions.map((d) => d.proposalId)
    set((state) => ({
      memories: result.memories,
      proposals: state.proposals.filter((p) => !processedIds.includes(p.id)),
    }))
    return result.memories
  },

  applyAllProposals: async (conversationId) => {
    const result = await memoriesApi.applyAllProposals(conversationId)
    set({ memories: result.memories, proposals: [] })
    return result.memories
  },

  runDecay: async (conversationId) => {
    const result = await memoriesApi.decayConversationMemories(conversationId)
    set({ lastDecay: { deleted: result.deleted, at: new Date().toISOString() } })
    const memories = await memoriesApi.listMemories(conversationId)
    set({ memories })
    return result
  },

  reset: () => set({ memories: [], proposals: [], loading: false, error: null, lastDecay: null }),
}))
