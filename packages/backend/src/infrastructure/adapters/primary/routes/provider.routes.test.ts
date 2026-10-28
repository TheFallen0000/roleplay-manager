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
    getProviderModelContext: Parameters<
      typeof buildProviderRouter
    >[0]["getProviderModelContext"],
  ): Promise<string> => {
    const app = express()
    app.use(
      buildProviderRouter({
        listProviders: { execute: vi.fn() } as never,
        validateProviderConnection: { execute: vi.fn() } as never,
        listProviderModels: { execute: vi.fn() } as never,
        getProviderModelContext,
      }),
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

  it("returns the detected context window", async () => {
    const execute = vi.fn(async () => ({
      id: "ollama",
      model: "llama3",
      contextWindow: 32_768,
    }))
    const base = await start({ execute } as never)

    const response = await fetch(
      `${base}/providers/ollama/model-context?model=llama3`,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: "ollama",
      model: "llama3",
      contextWindow: 32_768,
    })
    expect(execute).toHaveBeenCalledWith("ollama", "llama3", undefined)
  })

  it("forwards the instance id", async () => {
    const execute = vi.fn(async () => ({
      id: "openai-compatible",
      model: "qwen2.5",
      contextWindow: null,
    }))
    const base = await start({ execute } as never)

    const response = await fetch(
      `${base}/providers/openai-compatible/model-context?model=qwen2.5&instanceId=inst-1`,
    )

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith(
      "openai-compatible",
      "qwen2.5",
      "inst-1",
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
      `${base}/providers/unknown/model-context?model=llama3`,
    )

    expect(response.status).toBe(404)
    expect(execute).not.toHaveBeenCalled()
  })
})
