import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { EmbeddingConfigDTO } from "@workspace/shared/types/embedding"

import { buildErrorHandler } from "../middlewares/error-handler"
import { buildSettingsEmbeddingRouter } from "./settings-embedding.routes"

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

const config: EmbeddingConfigDTO = {
  provider: "ollama",
  providerInstanceId: null,
  models: { ollama: "nomic-embed-text" },
  hasApiKey: false,
  enabled: true,
  dimension: 8,
  status: { indexed: 2, missing: 1 },
}

describe("settings embedding routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (deps: {
    getEmbeddingConfig: { execute: ReturnType<typeof vi.fn> }
    configureEmbedding: { execute: ReturnType<typeof vi.fn> }
    reindexMemoryEmbeddings: { execute: ReturnType<typeof vi.fn> }
  }): Promise<string> => {
    const app = express()
    app.use(express.json())
    app.use(
      "/settings",
      buildSettingsEmbeddingRouter(deps as never),
    )
    app.use(buildErrorHandler(fakeLogger as never))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  it("GET /embeddings returns the config without an API key", async () => {
    const execute = vi.fn(async () => config)
    const base = await start({
      getEmbeddingConfig: { execute },
      configureEmbedding: { execute: vi.fn() },
      reindexMemoryEmbeddings: { execute: vi.fn() },
    })

    const response = await fetch(`${base}/settings/embeddings`)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(config)
    expect(JSON.stringify(body)).not.toContain("sk-secret")
  })

  it("PUT /embeddings persists the config and returns the DTO without the key", async () => {
    const execute = vi.fn(async () => config)
    const base = await start({
      getEmbeddingConfig: { execute: vi.fn(async () => config) },
      configureEmbedding: { execute },
      reindexMemoryEmbeddings: { execute: vi.fn() },
    })
    const payload = {
      provider: "ollama",
      providerInstanceId: null,
      models: { ollama: "nomic-embed-text" },
    }

    const response = await fetch(`${base}/settings/embeddings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith(payload)
    const body = await response.json()
    expect(body).toEqual(config)
    expect(JSON.stringify(body)).not.toContain("sk-secret")
  })

  it("PUT /embeddings rejects an unknown provider", async () => {
    const execute = vi.fn()
    const base = await start({
      getEmbeddingConfig: { execute: vi.fn(async () => config) },
      configureEmbedding: { execute },
      reindexMemoryEmbeddings: { execute: vi.fn() },
    })

    const response = await fetch(`${base}/settings/embeddings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "not-a-provider",
        providerInstanceId: null,
        models: {},
      }),
    })

    expect(response.status).toBe(400)
    expect(execute).not.toHaveBeenCalled()
  })

  it("POST /embeddings/reindex returns indexed, missing and failed", async () => {
    const execute = vi.fn(async () => ({
      indexed: 3,
      missing: 1,
      failed: 0,
    }))
    const base = await start({
      getEmbeddingConfig: { execute: vi.fn(async () => config) },
      configureEmbedding: { execute: vi.fn() },
      reindexMemoryEmbeddings: { execute },
    })

    const response = await fetch(`${base}/settings/embeddings/reindex`, {
      method: "POST",
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      indexed: 3,
      missing: 1,
      failed: 0,
    })
    expect(execute).toHaveBeenCalledWith()
  })
})
