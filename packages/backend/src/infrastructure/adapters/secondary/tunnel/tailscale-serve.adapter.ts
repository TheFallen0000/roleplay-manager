import { spawn } from "node:child_process"
import { existsSync } from "node:fs"

import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import { TunnelCommandError, TunnelServeNotEnabledError } from "../../../../domain/errors"
import type { TunnelController } from "../../../../domain/ports/tunnel-controller"

export interface CommandResult {
  stdout: string
  stderr: string
}

export interface CommandOptions {
  /** Overrides the default command timeout. */
  timeoutMs?: number
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: CommandOptions,
) => Promise<CommandResult>

export interface TailscaleServeAdapterOptions {
  /** Local URL to share (the frontend origin, e.g. `http://localhost:4321`). */
  targetUrl: string
  /** Explicit path to the `tailscale` binary; auto-detected when omitted. */
  binPath?: string
  /** Injectable for tests; defaults to a real process runner. */
  run?: CommandRunner
}

const WINDOWS_DEFAULT_BIN = "C:\\Program Files\\Tailscale\\tailscale.exe"
const COMMAND_TIMEOUT_MS = 15_000
const ENABLE_TIMEOUT_MS = 10_000
const SERVE_DISABLED_MARKER = /serve is not enabled/i
const SERVE_CONSENT_URL_PATTERN =
  /https:\/\/login\.tailscale\.com\/f\/serve\S*/
const TAILNET_DNS_URL = "https://login.tailscale.com/admin/dns"

const UNAVAILABLE_STATUS: TunnelStatusDTO = {
  available: false,
  connected: false,
  active: false,
  url: null,
}

interface TailscaleStatusJson {
  BackendState?: string
  Self?: { DNSName?: string }
}

interface ServeHandler {
  Proxy?: string
}

interface ServeServer {
  Handlers?: Record<string, ServeHandler>
}

interface ServeConfigJson {
  Web?: Record<string, ServeServer>
}

/**
 * Controls `tailscale serve` to share the app inside the tailnet.
 *
 * - `getStatus` never throws: when the binary is missing it returns
 *   `available: false`; when Tailscale is not running, `connected: false`.
 * - `enable`/`disable` throw `TunnelCommandError` when the command fails.
 */
export class TailscaleServeAdapter implements TunnelController {
  private readonly targetUrl: string
  private readonly explicitBin: string | null
  private readonly run: CommandRunner

  constructor(options: TailscaleServeAdapterOptions) {
    this.targetUrl = options.targetUrl
    this.explicitBin = options.binPath ?? null
    this.run = options.run ?? defaultRunner
  }

  async getStatus(): Promise<TunnelStatusDTO> {
    const bin = this.resolveBin()

    let statusRaw: string
    try {
      statusRaw = (await this.run(bin, ["status", "--json"])).stdout
    } catch (error) {
      if (isNotFoundError(error)) return UNAVAILABLE_STATUS
      // Installed but not running / signed out.
      return { available: true, connected: false, active: false, url: null }
    }

    const parsed = safeJson<TailscaleStatusJson>(statusRaw)
    const dnsName = (parsed?.Self?.DNSName ?? "").replace(/\.$/, "")
    const connected = parsed?.BackendState === "Running"
    const active = await this.detectServing(bin)

    return {
      available: true,
      connected,
      active,
      url: connected && dnsName.length > 0 ? `https://${dnsName}` : null,
    }
  }

  async enable(): Promise<TunnelStatusDTO> {
    const bin = this.resolveBin()
    try {
      await this.run(
        bin,
        ["serve", "--bg", "--yes", "--https=443", this.targetUrl],
        { timeoutMs: ENABLE_TIMEOUT_MS },
      )
    } catch (error) {
      const output = describeOutput(error)
      if (SERVE_DISABLED_MARKER.test(output)) {
        throw new TunnelServeNotEnabledError(
          extractServeConsentUrl(output) ?? TAILNET_DNS_URL,
        )
      }
      throw new TunnelCommandError(describeError(error))
    }
    return this.getStatus()
  }

  async disable(): Promise<TunnelStatusDTO> {
    const bin = this.resolveBin()
    const current = await this.getStatus()
    if (!current.active) return current
    try {
      await this.run(bin, ["serve", "--yes", "--https=443", "off"])
    } catch (error) {
      throw new TunnelCommandError(describeError(error))
    }
    return this.getStatus()
  }

  private async detectServing(bin: string): Promise<boolean> {
    try {
      const serveRaw = (await this.run(bin, ["serve", "status", "--json"]))
        .stdout
      return this.isServingTarget(serveRaw)
    } catch {
      return false
    }
  }

  private resolveBin(): string {
    if (this.explicitBin) return this.explicitBin
    if (process.platform === "win32" && existsSync(WINDOWS_DEFAULT_BIN)) {
      return WINDOWS_DEFAULT_BIN
    }
    return "tailscale"
  }

  private isServingTarget(serveRaw: string): boolean {
    const config = safeJson<ServeConfigJson>(serveRaw)
    const web = config?.Web
    if (!web || typeof web !== "object") return false

    const port = targetPort(this.targetUrl)
    for (const server of Object.values(web)) {
      const handlers = server?.Handlers
      if (!handlers || typeof handlers !== "object") continue
      for (const handler of Object.values(handlers)) {
        if (proxyMatchesPort(handler?.Proxy, port)) return true
      }
    }
    return false
  }
}

const defaultRunner: CommandRunner = (command, args, options) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      timeout: options?.timeoutMs ?? COMMAND_TIMEOUT_MS,
      windowsHide: true,
    })

    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8")
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      const error = new Error(`Command failed with exit code ${code}`) as Error & {
        stdout?: string
        stderr?: string
      }
      error.stdout = stdout
      error.stderr = stderr
      reject(error)
    })
  })

const isNotFoundError = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT"

const describeError = (error: unknown): string => {
  const stderr = (error as { stderr?: string } | undefined)?.stderr?.trim()
  if (stderr) return stderr
  return (error as Error).message
}

const describeOutput = (error: unknown): string => {
  const stdout = (error as { stdout?: string } | undefined)?.stdout ?? ""
  const stderr = (error as { stderr?: string } | undefined)?.stderr ?? ""
  return `${stdout}\n${stderr}`
}

const extractServeConsentUrl = (output: string): string | null => {
  const match = output.match(SERVE_CONSENT_URL_PATTERN)
  return match ? match[0] : null
}

const safeJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const targetPort = (targetUrl: string): string | null => {
  try {
    return new URL(targetUrl).port || null
  } catch {
    return null
  }
}

const proxyMatchesPort = (proxy: unknown, port: string | null): boolean => {
  if (typeof proxy !== "string" || proxy.length === 0) return false
  if (!port) return true
  try {
    return new URL(proxy).port === port
  } catch {
    return proxy.endsWith(`:${port}`)
  }
}
