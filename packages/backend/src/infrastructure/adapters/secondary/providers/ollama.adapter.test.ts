import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import type { ToolDefinition } from "../../../../domain/value-objects/prompt-context"
import { OllamaAdapter } from "./ollama.adapter"
import type { PromptContext } from "../../../../domain/value-objects/prompt-context"

const silentLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(function (this: Logger) {
    return this
  }),
}

const baseContext: PromptContext = {
  systemPrompt: "Eres un asistente.",
  messages: [{ role: "user", content: "Hola" }],
}

function buildAdapter() {
  return new OllamaAdapter({
    baseUrl: "http://localhost:11434",
    timeoutMs: 5000,
    streamingTimeoutMs: 5000,
    logger: silentLogger,
  })
}

function makeFetchMock(chunks: Array<Record<string, unknown>>) {
  const enc = new TextEncoder()
  const body = chunks.map((c) => JSON.stringify(c) + "\n").join("")
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(body))
      controller.close()
    },
  })

  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: stream,
  })
}

describe("OllamaAdapter - tool calling", () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("pasa tools en el body cuando se proveen", async () => {
    const fetchMock = makeFetchMock([{ message: { content: "Hola" }, done: true }])
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const tool: ToolDefinition = {
      type: "function",
      function: { name: "ping", description: "d", parameters: { type: "object", properties: {} } },
    }
    const adapter = buildAdapter()
    for await (const _ of adapter.generateStreaming(baseContext, {
      model: "llama3",
      tools: [tool],
    })) {
      // consume
    }

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body.tools).toEqual([tool])
  })

  it("NO incluye tools en el body cuando no se proveen", async () => {
    const fetchMock = makeFetchMock([{ message: { content: "Hola" }, done: true }])
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const adapter = buildAdapter()
    for await (const _ of adapter.generateStreaming(baseContext, { model: "llama3" })) {
      // consume
    }

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body.tools).toBeUndefined()
  })

  it("emite chunks de content normales", async () => {
    globalThis.fetch = makeFetchMock([
      { message: { content: "Hola" } },
      { message: { content: " mundo" } },
      { message: {}, done: true },
    ]) as unknown as typeof fetch

    const adapter = buildAdapter()
    const out: Array<{ content?: string; toolCalls?: any[] }> = []
    for await (const chunk of adapter.generateStreaming(baseContext, { model: "llama3" })) {
      out.push(chunk)
    }
    expect(out).toEqual([{ content: "Hola" }, { content: " mundo" }])
  })

  it("emite toolCalls desde message.tool_calls en NDJSON", async () => {
    globalThis.fetch = makeFetchMock([
      {
        message: {
          tool_calls: [
            { id: "c1", function: { name: "ping", arguments: "" } },
          ],
        },
      },
      {
        message: {
          tool_calls: [
            { function: { arguments: '{"x":' } },
          ],
        },
      },
      {
        message: {
          tool_calls: [
            { function: { arguments: "1}" } },
          ],
        },
      },
      { message: { content: "Listo" } },
    ]) as unknown as typeof fetch

    const adapter = buildAdapter()
    const out: Array<{ content?: string; toolCalls?: any[] }> = []
    for await (const chunk of adapter.generateStreaming(baseContext, { model: "llama3" })) {
      out.push(chunk)
    }

    expect(out).toHaveLength(4)
    expect(out[0].toolCalls).toEqual([
      { index: 0, id: "c1", functionName: "ping", argumentsDelta: "" },
    ])
    expect(out[1].toolCalls).toEqual([
      { index: 0, argumentsDelta: '{"x":' },
    ])
    expect(out[2].toolCalls).toEqual([
      { index: 0, argumentsDelta: "1}" },
    ])
    expect(out[3].content).toBe("Listo")
  })

  it("acepta arguments como objeto (no string) y lo serializa", async () => {
    globalThis.fetch = makeFetchMock([
      {
        message: {
          tool_calls: [
            { id: "c1", function: { name: "ping", arguments: { a: 1 } } },
          ],
        },
      },
    ]) as unknown as typeof fetch

    const adapter = buildAdapter()
    const out: Array<{ content?: string; toolCalls?: any[] }> = []
    for await (const chunk of adapter.generateStreaming(baseContext, { model: "llama3" })) {
      out.push(chunk)
    }

    expect(out[0].toolCalls).toEqual([
      { index: 0, id: "c1", functionName: "ping", argumentsDelta: '{"a":1}' },
    ])
  })

  it("maneja tool_calls vacios sin emitir chunk vacio", async () => {
    globalThis.fetch = makeFetchMock([
      { message: { tool_calls: [] } },
      { message: { content: "x" } },
    ]) as unknown as typeof fetch

    const adapter = buildAdapter()
    const out: Array<{ content?: string; toolCalls?: any[] }> = []
    for await (const chunk of adapter.generateStreaming(baseContext, { model: "llama3" })) {
      out.push(chunk)
    }

    expect(out).toEqual([{ content: "x" }])
  })
})

describe("OllamaAdapter - context window", () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const mockShow = (body: Record<string, unknown>, ok = true) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    return fetchMock
  }

  it("prefers the explicit num_ctx of the model parameters", async () => {
    const fetchMock = mockShow({
      parameters: "stop <|im_end|>\nnum_ctx 8192",
      model_info: { "llama.context_length": 131_072 },
    })

    expect(await buildAdapter().getModelContextWindow("llama3")).toBe(8192)
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/api/show",
      expect.objectContaining({ method: "POST" }),
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      model: "llama3",
    })
  })

  it("falls back to the architecture context length", async () => {
    mockShow({
      parameters: "",
      model_info: {
        "general.architecture": "llama",
        "llama.context_length": 131_072,
      },
    })

    expect(await buildAdapter().getModelContextWindow("llama3")).toBe(131_072)
  })

  it("returns null when the model does not report a window", async () => {
    mockShow({ model_info: { "llama.embedding_length": 4096 } })

    expect(await buildAdapter().getModelContextWindow("llama3")).toBeNull()
  })

  it("returns null when /api/show fails", async () => {
    mockShow({}, false)

    expect(await buildAdapter().getModelContextWindow("llama3")).toBeNull()
  })

  it("returns null when the network fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch

    expect(await buildAdapter().getModelContextWindow("llama3")).toBeNull()
  })
})
