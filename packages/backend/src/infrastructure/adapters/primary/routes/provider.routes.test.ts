import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildErrorHandler } from "../middlewares/error-handler"
import { buildProviderRouter } from "./provider.routes"

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

const makeCapabilitiesResult = (
  id: "ollama" | "openai-compatible",
  model: string,
  contextWindow: number | null
) => {
  const safetyMargin =
    contextWindow === null
      ? null
      : Math.max(128, Math.floor((contextWindow * 5) / 100))
  return {
    id,
    model,
    capabilities: {
      identity: {
        provider: id,
        instanceId: null,
        normalizedModel: model.toLowerCase(),
      },
      contextWindow,
      contextWindowSource:
        contextWindow === null ? null : "runtime-introspection",
      contextWindowConfidence: contextWindow === null ? null : "high",
      maxOutputTokens: null,
      maxOutputTokensSource: null,
      maxOutputTokensConfidence: null,
      confidence: contextWindow === null ? null : "high",
      warnings: [],
    },
    workingWindow: {
      status: contextWindow === null ? "unknown" : "ok",
      contextWindow,
      outputReserve: contextWindow === null ? null : 2_048,
      safetyMargin,
      workingWindow:
        contextWindow === null || safetyMargin === null
          ? null
          : contextWindow - 2_048 - safetyMargin,
      warnings: [],
    },
  }
}

describe("provider routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    getModelCapabilities: Parameters<
      typeof buildProviderRouter
    >[0]["getModelCapabilities"]
  ): Promise<string> => {
    const app = express()
    app.use(
      buildProviderRouter({
        listProviders: { execute: vi.fn() } as never,
        validateProviderConnection: { execute: vi.fn() } as never,
        listProviderModels: { execute: vi.fn() } as never,
        getModelCapabilities,
      })
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

  it("maps the legacy route to the context window shape", async () => {
    const result = makeCapabilitiesResult("ollama", "llama3", 32_768)
    const execute = vi.fn(async () => result)
    const base = await start({ execute } as never)

    const response = await fetch(
      `${base}/providers/ollama/model-context?model=llama3`
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: "ollama",
      model: "llama3",
      contextWindow: 32_768,
    })
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ollama",
        model: "llama3",
        providerInstanceId: undefined,
        probeOnly: true,
      })
    )
  })

  it("forwards the instance id on the legacy route", async () => {
    const result = makeCapabilitiesResult("openai-compatible", "qwen2.5", null)
    const execute = vi.fn(async () => result)
    const base = await start({ execute } as never)

    const response = await fetch(
      `${base}/providers/openai-compatible/model-context?model=qwen2.5&instanceId=inst-1`
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: "openai-compatible",
      model: "qwen2.5",
      contextWindow: null,
    })
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "openai-compatible",
        model: "qwen2.5",
        providerInstanceId: "inst-1",
        probeOnly: true,
      })
    )
  })

  it("returns the full capabilities result", async () => {
    const result = makeCapabilitiesResult(
      "openai-compatible",
      "gpt-4o-mini",
      128_000
    )
    const execute = vi.fn(async () => result)
    const base = await start({ execute } as never)

    const response = await fetch(
      `${base}/providers/openai-compatible/capabilities?model=gpt-4o-mini&instanceId=inst-1`
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(result)
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "openai-compatible",
        model: "gpt-4o-mini",
        providerInstanceId: "inst-1",
      })
    )
  })

  it("forwards the conversation override on the capabilities route", async () => {
    const result = makeCapabilitiesResult(
      "openai-compatible",
      "gpt-4o-mini",
      8_192
    )
    const execute = vi.fn(async () => result)
    const base = await start({ execute } as never)

    const response = await fetch(
      `${base}/providers/openai-compatible/capabilities?model=gpt-4o-mini&contextWindow=8192&maxTokens=4096`
    )

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "openai-compatible",
        model: "gpt-4o-mini",
        conversationOverride: { contextWindow: 8_192, maxTokens: 4_096 },
      })
    )
  })

  it("rejects a missing model", async () => {
    const execute = vi.fn()
    const base = await start({ execute } as never)

    const response = await fetch(`${base}/providers/ollama/model-context`)

    expect(response.status).toBe(400)
    expect(execute).not.toHaveBeenCalled()
  })

  it("rejects an unknown provider", async () => {
    const execute = vi.fn()
    const base = await start({ execute } as never)

    const response = await fetch(
      `${base}/providers/unknown/model-context?model=llama3`
    )

    expect(response.status).toBe(404)
    expect(execute).not.toHaveBeenCalled()
  })
})
