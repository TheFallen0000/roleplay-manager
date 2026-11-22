import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const embeddingsCreateMock = vi.fn()

vi.mock("openai", () => {
  return {
    default: class FakeOpenAI {
      embeddings = {
        create: (...args: unknown[]) => embeddingsCreateMock(...args),
      }
      chat = {
        completions: {
          create: vi.fn(),
        },
      }
    },
  }
})

import type { Logger } from "../../../../domain/ports/logger.port"
import { ProviderError } from "../../primary/middlewares/error-handler"
import { OpenAICompatibleAdapter } from "./openai-compatible.adapter"

const silentLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(function (this: Logger) {
    return this
  }),
}

const buildAdapter = (): OpenAICompatibleAdapter =>
  new OpenAICompatibleAdapter({
    baseUrl: "http://localhost:1234/v1",
    apiKey: null,
    timeoutMs: 1000,
    streamingTimeoutMs: 1000,
    logger: silentLogger,
  })

const coarseLength = (vector: readonly number[]): number =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))

describe("OpenAICompatibleAdapter - embeddings", () => {
  beforeEach(() => {
    embeddingsCreateMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls embeddings.create and maps data[].embedding to L2 vectors", async () => {
    embeddingsCreateMock.mockResolvedValue({
      data: [{ embedding: [3, 4] }, { embedding: [0, 5] }],
      model: "text-embedding-3-small",
    })

    const result = await buildAdapter().embed({
      texts: ["El dragón", "El wyrm"],
      model: "text-embedding-3-small",
    })

    expect(embeddingsCreateMock).toHaveBeenCalledTimes(1)
    expect(embeddingsCreateMock).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: ["El dragón", "El wyrm"],
    })

    expect(result.model).toBe("text-embedding-3-small")
    expect(result.dimension).toBe(2)
    expect(result.vectors).toHaveLength(2)
    for (const vector of result.vectors) {
      expect(coarseLength(vector)).toBeCloseTo(1, 6)
    }
    expect(result.vectors[0][0]).toBeCloseTo(0.6, 6)
    expect(result.vectors[0][1]).toBeCloseTo(0.8, 6)
  })

  it("wraps an SDK failure in a ProviderError", async () => {
    embeddingsCreateMock.mockRejectedValue(new Error("boom"))

    await expect(
      buildAdapter().embed({ texts: ["hola"], model: "text-embedding-3-small" }),
    ).rejects.toBeInstanceOf(ProviderError)
  })
})
