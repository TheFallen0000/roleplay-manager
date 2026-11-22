import { afterEach, describe, expect, it, vi } from "vitest"

import { apiRequest } from "./client"
import {
  getEmbeddingConfig,
  reindexMemoryEmbeddings,
  setEmbeddingConfig,
} from "./embeddings"

vi.mock("./client", () => ({
  apiRequest: vi.fn(),
}))

const apiRequestMock = vi.mocked(apiRequest)

afterEach(() => {
  apiRequestMock.mockReset()
})

describe("embeddings API", () => {
  it("loads the aggregated embedding config from /api/settings/embeddings", async () => {
    apiRequestMock.mockResolvedValue({ provider: null })

    await getEmbeddingConfig()

    expect(apiRequestMock).toHaveBeenCalledWith("/api/settings/embeddings")
  })

  it("persists the config with PUT", async () => {
    apiRequestMock.mockResolvedValue(undefined)
    const input = {
      provider: "ollama" as const,
      providerInstanceId: null,
      models: { ollama: "nomic-embed-text" },
    }

    await setEmbeddingConfig(input)

    expect(apiRequestMock).toHaveBeenCalledWith("/api/settings/embeddings", {
      method: "PUT",
      body: JSON.stringify(input),
    })
  })

  it("starts a global reindex with POST and returns its counters", async () => {
    const result = { indexed: 2, missing: 1, failed: 0 }
    apiRequestMock.mockResolvedValue(result)

    const response = await reindexMemoryEmbeddings()

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/settings/embeddings/reindex",
      {
        method: "POST",
      },
    )
    expect(response).toEqual(result)
  })
})
