import { describe, expect, it, vi } from "vitest"

import type { ProviderInstanceRecord } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { CreateProviderInstanceUseCase } from "./create-provider-instance.use-case"
import { ListProviderInstancesUseCase } from "./list-provider-instances.use-case"
import { UpdateProviderInstanceUseCase } from "./update-provider-instance.use-case"

const secret = "sk-super-secret-key"

const record: ProviderInstanceRecord = {
  id: "inst-1",
  kind: "openai-compatible",
  name: "OpenAI",
  url: "https://api.example.com/v1",
  hasApiKey: true,
  apiKey: secret,
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

const buildRepo = () => ({
  list: vi.fn(async () => [record]),
  findById: vi.fn(async () => record),
  create: vi.fn(async () => record),
  update: vi.fn(async () => record),
  delete: vi.fn(async () => {}),
})

describe("provider instance API sanitization", () => {
  it("list does not expose the API key", async () => {
    const result = await new ListProviderInstancesUseCase(buildRepo()).execute()

    expect(result).toEqual([
      {
        id: "inst-1",
        kind: "openai-compatible",
        name: "OpenAI",
        url: "https://api.example.com/v1",
        hasApiKey: true,
        createdAt: "2026-10-27T12:00:00.000Z",
        updatedAt: "2026-10-27T12:00:00.000Z",
      },
    ])
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it("create does not expose the API key", async () => {
    const result = await new CreateProviderInstanceUseCase(
      buildRepo(),
      logger,
    ).execute({
      kind: "openai-compatible",
      name: "OpenAI",
      url: "https://api.example.com/v1",
      apiKey: secret,
    })

    expect(result).not.toHaveProperty("apiKey")
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it("update does not expose the API key", async () => {
    const result = await new UpdateProviderInstanceUseCase(
      buildRepo(),
      logger,
    ).execute("inst-1", { name: "Renamed" })

    expect(result).not.toHaveProperty("apiKey")
    expect(JSON.stringify(result)).not.toContain(secret)
  })
})
