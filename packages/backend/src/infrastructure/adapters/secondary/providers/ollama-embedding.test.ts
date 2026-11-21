import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { ProviderError, ProviderTimeoutError } from "../../primary/middlewares/error-handler"
import { OllamaAdapter } from "./ollama.adapter"

const silentLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(function (this: Logger) {
    return this
  }),
}

const buildAdapter = (): OllamaAdapter =>
  new OllamaAdapter({
    baseUrl: "http://localhost:11434",
    timeoutMs: 5000,
    streamingTimeoutMs: 5000,
    logger: silentLogger,
  })

const mockJson = (body: unknown, ok = true, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

const coarseLength = (vector: readonly number[]): number =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))

describe("OllamaAdapter - embeddings", () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("posts the texts to /api/embed and returns L2-normalized vectors", async () => {
    const fetchMock = mockJson({
      embeddings: [
        [3, 4],
        [0, 5],
      ],
    })

    const result = await buildAdapter().embed({
      texts: ["El dragón", "El wyrm"],
      model: "nomic-embed-text",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("http://localhost:11434/api/embed")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual({
      model: "nomic-embed-text",
      input: ["El dragón", "El wyrm"],
    })

    expect(result.model).toBe("nomic-embed-text")
    expect(result.dimension).toBe(2)
    expect(result.vectors).toHaveLength(2)
    for (const vector of result.vectors) {
      expect(coarseLength(vector)).toBeCloseTo(1, 6)
    }
    expect(result.vectors[0][0]).toBeCloseTo(0.6, 6)
    expect(result.vectors[0][1]).toBeCloseTo(0.8, 6)
  })

  it("rejects with a ProviderError when /api/embed is not OK", async () => {
    mockJson({ error: "model not found" }, false, 404)

    await expect(
      buildAdapter().embed({ texts: ["hola"], model: "missing" }),
    ).rejects.toBeInstanceOf(ProviderError)
  })

  it("rejects with a ProviderTimeoutError when the request aborts", async () => {
    const abort = new Error("aborted")
    abort.name = "AbortError"
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(abort) as unknown as typeof fetch

    await expect(
      buildAdapter().embed({ texts: ["hola"], model: "llama3" }),
    ).rejects.toBeInstanceOf(ProviderTimeoutError)
  })
})
