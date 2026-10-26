import type {
  GenerateSummaryResponse,
  SummaryDTO,
  UpdateSummaryInput,
} from "@workspace/shared/types/summary"

import { apiRequest } from "./client"

export const listSummaries = (conversationId: string): Promise<SummaryDTO[]> =>
  apiRequest(`/api/conversations/${conversationId}/summaries`)

export const generateSummary = (
  conversationId: string,
): Promise<GenerateSummaryResponse> =>
  apiRequest(`/api/conversations/${conversationId}/summaries/generate`, {
    method: "POST",
  })

export const updateSummary = (
  conversationId: string,
  summaryId: string,
  input: UpdateSummaryInput,
): Promise<SummaryDTO> =>
  apiRequest(`/api/conversations/${conversationId}/summaries/${summaryId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const deleteSummary = (
  conversationId: string,
  summaryId: string,
): Promise<void> =>
  apiRequest(`/api/conversations/${conversationId}/summaries/${summaryId}`, {
    method: "DELETE",
  })
