import { describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../domain/ports/logger.port"
import type {
  ProviderInstanceRecord,
  ProviderInstanceRepository,
} from "../../../domain/ports/provider-instance.repository"
import { UpdateProviderInstanceUseCase } from "./update-provider-instance.use-case"

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

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
} as unknown as Logger

const buildRepo = (): ProviderInstanceRepository => ({
  list: vi.fn(async () => [record]),
  findById: vi.fn(async () => record),
  create: vi.fn(async () => record),
  update: vi.fn(async () => record),
  delete: vi.fn(async () => {}),
})

const buildCache = () => ({ invalidateInstance: vi.fn() })

describe("UpdateProviderInstanceUseCase cache invalidation", () => {
  it("invalidates the instance cache after a successful update", async () => {
    const repo = buildRepo()
    const cache = buildCache()
    const useCase = new UpdateProviderInstanceUseCase(repo, logger, cache)

    const result = await useCase.execute("inst-1", { name: "Renamed" })

    expect(result).not.toHaveProperty("apiKey")
    expect(repo.update).toHaveBeenCalledWith("inst-1", { name: "Renamed" })
    expect(cache.invalidateInstance).toHaveBeenCalledWith("inst-1")
  })

  it("does not invalidate when the instance is missing", async () => {
    const repo = buildRepo()
    repo.findById = vi.fn(async () => null)
    const cache = buildCache()
    const useCase = new UpdateProviderInstanceUseCase(repo, logger, cache)

    await expect(
      useCase.execute("missing", { name: "Renamed" })
    ).rejects.toThrow("Provider instance 'missing' not found.")

    expect(cache.invalidateInstance).not.toHaveBeenCalled()
  })

  it("does not invalidate when the repository update throws", async () => {
    const repo = buildRepo()
    repo.update = vi.fn(async () => {
      throw new Error("db down")
    })
    const cache = buildCache()
    const useCase = new UpdateProviderInstanceUseCase(repo, logger, cache)

    await expect(
      useCase.execute("inst-1", { name: "Renamed" })
    ).rejects.toThrow("db down")

    expect(cache.invalidateInstance).not.toHaveBeenCalled()
  })
})
