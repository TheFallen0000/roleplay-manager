import { create } from "zustand"
import type {
  GenerateSummaryResponse,
  SummaryDTO,
} from "@workspace/shared/types/summary"

import * as summariesApi from "@/lib/api/summaries"

export interface SummaryState {
  summaries: SummaryDTO[]
  loading: boolean
  error: string | null

  loadSummaries: (conversationId: string) => Promise<void>
  generateSummary: (
    conversationId: string,
  ) => Promise<GenerateSummaryResponse | null>
  updateSummary: (conversationId: string, summaryId: string, content: string) => Promise<SummaryDTO>
  deleteSummary: (conversationId: string, summaryId: string) => Promise<void>
  reset: () => void
}

export const useSummaryStore = create<SummaryState>((set) => ({
  summaries: [],
  loading: false,
  error: null,

  loadSummaries: async (conversationId) => {
    set({ loading: true, error: null })
    try {
      const summaries = await summariesApi.listSummaries(conversationId)
      set({ summaries, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  generateSummary: async (conversationId) => {
    try {
      const result = await summariesApi.generateSummary(conversationId)
      set((state) => ({ summaries: [result.summary, ...state.summaries] }))
      return result
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  updateSummary: async (conversationId, summaryId, content) => {
    const summary = await summariesApi.updateSummary(conversationId, summaryId, { content })
    set((state) => ({
      summaries: state.summaries.map((s) => (s.id === summaryId ? summary : s)),
    }))
    return summary
  },

  deleteSummary: async (conversationId, summaryId) => {
    await summariesApi.deleteSummary(conversationId, summaryId)
    set((state) => ({
      summaries: state.summaries.filter((s) => s.id !== summaryId),
    }))
  },

  reset: () => set({ summaries: [], loading: false, error: null }),
}))
