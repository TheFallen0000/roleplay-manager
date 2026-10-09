import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http"
import { networkInterfaces } from "node:os"

import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import { LanAccessError, LanPortInUseError } from "../../../../domain/errors"
import type { LanAccessController } from "../../../../domain/ports/lan-access-controller"

export interface LanProxyServerAdapterOptions {
  /** Local URL of the app to share (e.g. `http://localhost:4321`). */
  targetUrl: string
  /** Port to listen on (defaults to 4322). */
  port?: number
  /** Injectable for tests; defaults to the machine's private IPv4 addresses. */
  listAddresses?: () => string[]
}

const DEFAULT_PORT = 4322

/** Header the proxy adds so the app can tell remote requests apart. */
export const LAN_ACCESS_MARKER_HEADER = "x-rm-lan-access"

const VIRTUAL_INTERFACE =
  /virtual|vmware|vbox|hyper-v|wsl|loopback|docker|tailscale|vethernet|wi-fi direct|área local|area local|local area connection|\*/i

const PRIVATE_PATTERNS: Array<{ pattern: RegExp; priority: number }> = [
  { pattern: /^192\.168\.\d{1,3}\.\d{1,3}$/, priority: 0 },
  { pattern: /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, priority: 1 },
  { pattern: /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, priority: 2 },
]

/**
 * HTTP proxy that shares the app on the local network.
 *
 * Listens on `0.0.0.0:<port>` and forwards everything (HTML, assets, API, SSE
 * and uploads) to the local frontend while keeping the original `Host`, so
 * Astro's origin check keeps passing. It can be turned on and off on the fly.
 */
export class LanProxyServerAdapter implements LanAccessController {
  private readonly target: URL
  private readonly port: number
  private readonly listAddresses: () => string[]
  private server: Server | null = null
  private activePort: number

  constructor(options: LanProxyServerAdapterOptions) {
    this.target = new URL(options.targetUrl)
    this.port = options.port ?? DEFAULT_PORT
    this.activePort = this.port
    this.listAddresses = options.listAddresses ?? listPrivateAddresses
  }

  getStatus(): Promise<LanAccessStatusDTO> {
    return Promise.resolve({
      active: this.server !== null,
      port: this.server ? this.activePort : this.port,
      addresses: this.listAddresses(),
    })
  }

  async enable(): Promise<LanAccessStatusDTO> {
    if (this.server) return this.getStatus()

    const server = createServer((request, response) =>
      this.proxyRequest(request, response),
    )
    server.on("clientError", (_error, socket) => socket.destroy())

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => reject(error)
        server.once("error", onError)
        server.listen(this.port, "0.0.0.0", () => {
          server.off("error", onError)
          resolve()
        })
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EADDRINUSE") {
        throw new LanPortInUseError(this.port)
      }
      throw new LanAccessError((error as Error).message)
    }

    const address = server.address()
    this.activePort =
      typeof address === "object" && address ? address.port : this.port
    // Don't keep the process alive on shutdown.
    server.unref()
    this.server = server
    return this.getStatus()
  }

  async disable(): Promise<LanAccessStatusDTO> {
    const server = this.server
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      this.server = null
    }
    return this.getStatus()
  }

  private proxyRequest(request: IncomingMessage, response: ServerResponse): void {
    const upstream = httpRequest(
      {
        host: this.target.hostname,
        port: this.target.port || 80,
        path: request.url,
        method: request.method,
        // Keep the original Host so Astro's origin check keeps passing, and
        // mark the request so the idle watchdog can count it as remote use.
        headers: { ...request.headers, [LAN_ACCESS_MARKER_HEADER]: "1" },
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode ?? 502,
          upstreamResponse.headers,
        )
        upstreamResponse.pipe(response)
      },
    )

    upstream.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(502, { "content-type": "application/json" })
      }
      response.end(
        JSON.stringify({
          error: {
            code: "LAN_PROXY_UNAVAILABLE",
            message: "The app is not responding.",
          },
        }),
      )
    })

    request.pipe(upstream)
  }
}

/** Private IPv4 addresses of this machine, most likely first. */
export const listPrivateAddresses = (): string[] => {
  const candidates: Array<{ address: string; priority: number }> = []
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    if (!entries || VIRTUAL_INTERFACE.test(name)) continue
    for (const entry of entries) {
      if (entry.internal || entry.family !== "IPv4") continue
      const match = PRIVATE_PATTERNS.find(({ pattern }) =>
        pattern.test(entry.address),
      )
      if (!match) continue
      candidates.push({ address: entry.address, priority: match.priority })
    }
  }
  return [
    ...new Set(
      candidates
        .sort((a, b) => a.priority - b.priority)
        .map((candidate) => candidate.address),
    ),
  ]
}
