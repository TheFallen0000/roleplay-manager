import { describe, it, expect, vi, afterEach } from "vitest"
import type { APIContext, MiddlewareNext } from "astro"

import { onRequest } from "./middleware"

const buildContext = (url: string, init?: RequestInit): APIContext =>
  ({ url: new URL(url), request: new Request(url, init) }) as unknown as APIContext

const asNext = (next: (...args: unknown[]) => Promise<Response>): MiddlewareNext =>
  next as unknown as MiddlewareNext

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("api proxy middleware", () => {
  it("proxies /api requests to the backend and forwards the query string", async () => {
    const fetchMock = vi.fn(
      async (_url: URL | string, _init?: RequestInit) =>
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const next = vi.fn(async () => new Response("page"))

    const response = await onRequest(
      buildContext("http://localhost:4321/api/health?verbose=1"),
      asNext(next),
    )

    expect(next).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:3001/api/health?verbose=1",
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "ok" })
  })

  it("forwards method, body and headers on POST requests", async () => {
    const fetchMock = vi.fn(
      async (_url: URL | string, _init?: RequestInit) =>
        new Response(null, { status: 204 }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const next = vi.fn(async () => new Response("page"))

    const context = buildContext("http://localhost:4321/api/characters", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept-language": "es-ES",
      },
      body: JSON.stringify({ name: "Lyra" }),
    })

    const response = await onRequest(context, asNext(next))

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(204)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe("http://localhost:3001/api/characters")
    expect(init?.method).toBe("POST")
    const forwarded = init?.headers as Headers
    expect(forwarded.get("content-type")).toBe("application/json")
    expect(forwarded.get("accept-language")).toBe("es-ES")
    expect(forwarded.get("host")).toBeNull()
    expect(init?.body).not.toBeNull()
    expect((init as { duplex?: string } | undefined)?.duplex).toBe("half")
  })

  it("strips hop-by-hop and encoding headers from the response", async () => {
    const fetchMock = vi.fn(
      async (_url: URL | string, _init?: RequestInit) =>
        new Response("chunk", {
          status: 200,
          headers: {
            "content-type": "text/plain",
            "cache-control": "no-store",
            "content-encoding": "gzip",
            "transfer-encoding": "chunked",
          },
        }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const next = vi.fn(async () => new Response("page"))

    const response = await onRequest(
      buildContext("http://localhost:4321/api/health"),
      asNext(next),
    )

    expect(response.headers.get("content-type")).toBe("text/plain")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("content-encoding")).toBeNull()
    expect(response.headers.get("transfer-encoding")).toBeNull()
    expect(await response.text()).toBe("chunk")
  })

  it("lets non-/api requests through untouched", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const next = vi.fn(async () => new Response("page", { status: 200 }))

    const response = await onRequest(
      buildContext("http://localhost:4321/characters"),
      asNext(next),
    )

    expect(next).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await response.text()).toBe("page")
  })

  it("returns 502 when the backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      }),
    )
    const next = vi.fn(async () => new Response("page"))

    const response = await onRequest(
      buildContext("http://localhost:4321/api/health"),
      asNext(next),
    )

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: {
        code: "PROXY_UNAVAILABLE",
        message: "No se pudo conectar con el backend.",
      },
    })
  })

  it("honors the API_PROXY_TARGET override", async () => {
    vi.stubEnv("API_PROXY_TARGET", "http://localhost:9999")
    const fetchMock = vi.fn(
      async (_url: URL | string, _init?: RequestInit) =>
        new Response(null, { status: 200 }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const next = vi.fn(async () => new Response("page"))

    await onRequest(buildContext("http://localhost:4321/api/health"), asNext(next))

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:9999/api/health",
    )
  })
})
