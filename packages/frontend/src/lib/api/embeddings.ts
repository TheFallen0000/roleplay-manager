import type {
  ConfigureEmbeddingInput,
  EmbeddingConfigDTO,
  ReindexEmbeddingsResultDTO,
} from "@workspace/shared/types/embedding"

import { apiRequest } from "./client"

export const getEmbeddingConfig = async (): Promise<EmbeddingConfigDTO> => {
  return apiRequest("/api/settings/embeddings")
}

export const setEmbeddingConfig = async (
  input: ConfigureEmbeddingInput,
): Promise<EmbeddingConfigDTO> => {
  return apiRequest("/api/settings/embeddings", {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export const reindexMemoryEmbeddings =
  async (): Promise<ReindexEmbeddingsResultDTO> => {
    return apiRequest("/api/settings/embeddings/reindex", {
      method: "POST",
    })
  }
