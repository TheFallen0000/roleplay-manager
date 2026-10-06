import type { MiddlewareHandler } from "astro"

/**
 * Same-origin API proxy.
 *
 * The frontend origin serves `/api/*` by forwarding requests to the backend,
 * so the browser only ever talks to a single origin. This is what makes LAN
 * access work and what a future Tailscale Serve needs: serving just the
 * frontend port exposes the whole app (no CORS, no second URL).
 *
 * The backend target can be overridden with the server-only `API_PROXY_TARGET`
 * environment variable (defaults to `http://localhost:3001`).
 */
const DEFAULT_API_TARGET = "http://localhost:3001"

const REQUEST_HEADERS_TO_SKIP = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
])

const RESPONSE_HEADERS_TO_SKIP = new Set([
  "connection",
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "te",
  "trailer",
])

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url
  if (pathname !== "/api" && !pathname.startsWith("/api/")) {
    return next()
  }

  const target = process.env.API_PROXY_TARGET ?? DEFAULT_API_TARGET
  const url = new URL(pathname + context.url.search, target)

  const headers = new Headers(context.request.headers)
  for (const name of REQUEST_HEADERS_TO_SKIP) {
    headers.delete(name)
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: context.request.method,
    headers,
    redirect: "manual",
  }
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = context.request.body
    init.duplex = "half"
  }

  let upstream: Response
  try {
    upstream = await fetch(url, init)
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "PROXY_UNAVAILABLE",
          message: "No se pudo conectar con el backend.",
        },
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    )
  }

  const responseHeaders = new Headers(upstream.headers)
  for (const name of RESPONSE_HEADERS_TO_SKIP) {
    responseHeaders.delete(name)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}
