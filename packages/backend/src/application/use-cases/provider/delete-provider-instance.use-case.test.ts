import { describe, expect, it, vi } from "vitest"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type {
  ProviderInstanceRecord,
  ProviderInstanceRepository,
} from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { DeleteProviderInstanceUseCase } from "./delete-provider-instance.use-case"

const record: ProviderInstanceRecord = {
  id: "inst-1",
  kind: "openai-compatible",
  name: "OpenAI",
  url: "https://api.example.com/v1",
  hasApiKey: true,
  apiKey: "sk-secret",
  createdAt: "2026-10-27T12:00:00.000Z",
  updatedAt: "2026-10-27T12:00:00.000Z",
}

const buildRepo = (): ProviderInstanceRepository => ({
  list: vi.fn(async () => [record]),
  findById: vi.fn(async () => record),
  create: vi.fn(async () => record),
  update: vi.fn(async () => record),
  delete: vi.fn(async () => {}),
})

const buildConversations = (): ConversationRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  list: vi.fn(),
  listByCharacterId: vi.fn(),
  listByCharacterIds: vi.fn(),
  existsByAssetId: vi.fn(),
  update: vi.fn(),
  updateSettings: vi.fn(),
  clearProviderInstanceId: vi.fn(async () => {}),
})

const buildSettings = (value: string | null = null): SettingsRepository => ({
  get: vi.fn(async () => value),
  getMany: vi.fn(async () => ({})),
  set: vi.fn(async () => {}),
  setMany: vi.fn(async () => {}),
})

const buildCache = () => ({ invalidateInstance: vi.fn() })

describe("DeleteProviderInstanceUseCase cache invalidation", () => {
  it("invalidates the instance cache after a successful delete", async () => {
    const repo = buildRepo()
    const conversations = buildConversations()
    const cache = buildCache()
    const useCase = new DeleteProviderInstanceUseCase(
      repo,
      conversations,
      buildSettings(),
      cache
    )

    await useCase.execute("inst-1")

    expect(conversations.clearProviderInstanceId).toHaveBeenCalledWith("inst-1")
    expect(repo.delete).toHaveBeenCalledWith("inst-1")
    expect(cache.invalidateInstance).toHaveBeenCalledWith("inst-1")
  })

  it("does not invalidate when the instance is missing", async () => {
    const repo = buildRepo()
    repo.findById = vi.fn(async () => null)
    const cache = buildCache()
    const useCase = new DeleteProviderInstanceUseCase(
      repo,
      buildConversations(),
      buildSettings(),
      cache
    )

    await expect(useCase.execute("missing")).rejects.toThrow(
      "Provider instance 'missing' not found."
    )

    expect(cache.invalidateInstance).not.toHaveBeenCalled()
  })

  it("does not invalidate when the repository delete throws", async () => {
    const repo = buildRepo()
    repo.delete = vi.fn(async () => {
      throw new Error("db down")
    })
    const cache = buildCache()
    const useCase = new DeleteProviderInstanceUseCase(
      repo,
      buildConversations(),
      buildSettings(),
      cache
    )

    await expect(useCase.execute("inst-1")).rejects.toThrow("db down")

    expect(cache.invalidateInstance).not.toHaveBeenCalled()
  })
})
