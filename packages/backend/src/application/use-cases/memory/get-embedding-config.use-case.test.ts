import { describe, expect, it, vi } from "vitest"

import type { EmbeddingConfigDTO } from "@workspace/shared/types/embedding"

import { Conversation } from "../../../domain/entities/conversation.entity"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { EmbeddingRepository } from "../../../domain/ports/embedding.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { GetEmbeddingConfigUseCase } from "./get-embedding-config.use-case"

const now = new Date("2026-11-21T12:00:00.000Z")

const mkConversation = (id: string): Conversation =>
  Conversation.create({
    id,
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: "llama3",
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 20,
    summaryFrequency: 20,
    contextWindow: 8_000,
    compactionThreshold: 80,
    temperature: 0.7,
    maxTokens: 2_048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    createdAt: now,
    updatedAt: now,
  })

const buildSettings = (
  stored: Record<string, string | null> = {},
): SettingsRepository => ({
  get: vi.fn(async (key) => stored[key] ?? null),
  getMany: vi.fn(async () => stored),
  set: vi.fn(async () => {}),
  setMany: vi.fn(async () => {}),
})

const buildInstanceRepository = (
  apiKey: string | null = null,
): ProviderInstanceRepository => ({
  list: vi.fn(async () => []),
  findById: vi.fn(async (id) =>
    id === "inst-1"
      ? {
          id: "inst-1",
          kind: "openai-compatible" as const,
          name: "Remote",
          url: "https://api.example.com/v1",
          hasApiKey: apiKey !== null,
          apiKey,
          createdAt: "2026-11-21T12:00:00.000Z",
          updatedAt: "2026-11-21T12:00:00.000Z",
        }
      : null,
  ),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(async () => {}),
})

const buildConversationRepository = (ids: string[]): ConversationRepository => ({
  create: vi.fn(async (conversation) => conversation),
  findById: vi.fn(async (id) => (ids.includes(id) ? mkConversation(id) : null)),
  list: vi.fn(async () => ids.map(mkConversation)),
  listByCharacterId: vi.fn(async () => []),
  listByCharacterIds: vi.fn(async () => []),
  existsByAssetId: vi.fn(async () => false),
  update: vi.fn(async (conversation) => conversation),
  updateSettings: vi.fn(async () => mkConversation(ids[0]!)),
  clearProviderInstanceId: vi.fn(async () => {}),
})

const buildEmbeddingRepository = (): EmbeddingRepository => ({
  upsert: vi.fn(async () => {}),
  findByMemoryIds: vi.fn(async () => []),
  deleteByMemoryId: vi.fn(async () => {}),
  deleteByMemoryIds: vi.fn(async () => {}),
  listMissingForConversation: vi.fn(async () => []),
  countStatus: vi.fn(async (conversationId, target) => {
    if (target.dimension === null) {
      return conversationId === "conv-1"
        ? { indexed: 0, missing: 2 }
        : { indexed: 0, missing: 1 }
    }
    return conversationId === "conv-1"
      ? { indexed: 1, missing: 1 }
      : { indexed: 1, missing: 0 }
  }),
})

const buildUseCase = (params: {
  settings?: Record<string, string | null>
  conversations?: string[]
  apiKey?: string | null
} = {}) => {
  const embeddingRepository = buildEmbeddingRepository()
  const conversationRepository = buildConversationRepository(
    params.conversations ?? [],
  )
  const instanceRepository = buildInstanceRepository(params.apiKey ?? null)
  const useCase = new GetEmbeddingConfigUseCase(
    buildSettings(params.settings),
    instanceRepository,
    embeddingRepository,
    conversationRepository,
  )
  return { useCase, embeddingRepository, conversationRepository, instanceRepository }
}

describe("GetEmbeddingConfigUseCase", () => {
  it("returns the config, active dimension and aggregated index status", async () => {
    const { useCase, embeddingRepository } = buildUseCase({
      settings: {
        embeddings_provider: "openai-compatible",
        embeddings_provider_instance_id: "inst-1",
        embeddings_model_ollama: "nomic-embed-text",
        embeddings_model_openai_compatible: "text-embedding-3-small",
        embeddings_dimension: "8",
      },
      conversations: ["conv-1", "conv-2"],
      apiKey: "sk-secret-value",
    })

    const result: EmbeddingConfigDTO = await useCase.execute()

    expect(result).toEqual({
      provider: "openai-compatible",
      providerInstanceId: "inst-1",
      models: {
        ollama: "nomic-embed-text",
        openaiCompatible: "text-embedding-3-small",
      },
      hasApiKey: true,
      enabled: true,
      dimension: 8,
      status: { indexed: 2, missing: 1 },
    })
    expect(JSON.stringify(result)).not.toContain("sk-secret-value")
    expect(embeddingRepository.countStatus).toHaveBeenCalledWith("conv-1", {
      provider: "openai-compatible",
      model: "text-embedding-3-small",
      dimension: 8,
    })
    expect(embeddingRepository.countStatus).toHaveBeenCalledWith("conv-2", {
      provider: "openai-compatible",
      model: "text-embedding-3-small",
      dimension: 8,
    })
  })

  it("returns a null dimension and counts every memory missing before the first embed", async () => {
    const { useCase, embeddingRepository } = buildUseCase({
      settings: {
        embeddings_provider: "ollama",
        embeddings_model_ollama: "nomic-embed-text",
      },
      conversations: ["conv-1", "conv-2"],
    })

    const result = await useCase.execute()

    expect(result.dimension).toBeNull()
    expect(result.status).toEqual({ indexed: 0, missing: 3 })
    expect(embeddingRepository.countStatus).toHaveBeenCalledWith("conv-1", {
      provider: "ollama",
      model: "nomic-embed-text",
      dimension: null,
    })
  })

  it("reports disabled and zero status when nothing is configured", async () => {
    const { useCase, embeddingRepository } = buildUseCase()

    const result = await useCase.execute()

    expect(result).toEqual({
      provider: null,
      providerInstanceId: null,
      models: {},
      hasApiKey: false,
      enabled: false,
      dimension: null,
      status: { indexed: 0, missing: 0 },
    })
    expect(embeddingRepository.countStatus).not.toHaveBeenCalled()
  })

  it("treats an empty stored dimension as null", async () => {
    const { useCase } = buildUseCase({
      settings: {
        embeddings_provider: "ollama",
        embeddings_model_ollama: "nomic-embed-text",
        embeddings_dimension: "",
      },
    })

    const result = await useCase.execute()

    expect(result.dimension).toBeNull()
  })

  it("does not require an API key for local Ollama", async () => {
    const { useCase } = buildUseCase({
      settings: {
        embeddings_provider: "ollama",
        embeddings_model_ollama: "nomic-embed-text",
      },
    })

    const result = await useCase.execute()

    expect(result).toMatchObject({
      provider: "ollama",
      providerInstanceId: null,
      hasApiKey: false,
      enabled: true,
    })
  })

  it("reports the global OpenAI-compatible API key without an instance", async () => {
    const secret = "sk-global-secret"
    const { useCase, instanceRepository } = buildUseCase({
      settings: {
        embeddings_provider: "openai-compatible",
        embeddings_model_openai_compatible: "text-embedding-3-small",
        provider_openai_compatible_api_key: secret,
      },
    })

    const result = await useCase.execute()

    expect(result.hasApiKey).toBe(true)
    expect(result.providerInstanceId).toBeNull()
    expect(instanceRepository.findById).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it("falls back to a null provider when the stored provider is unknown", async () => {
    const { useCase } = buildUseCase({
      settings: { embeddings_provider: "not-a-provider" },
    })

    const result = await useCase.execute()

    expect(result.provider).toBeNull()
    expect(result.enabled).toBe(false)
  })
})
