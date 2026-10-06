import { describe, expect, it, vi } from "vitest"

import {
  TunnelCommandError,
  TunnelServeNotEnabledError,
} from "../../../../domain/errors"
import {
  TailscaleServeAdapter,
  type CommandRunner,
} from "./tailscale-serve.adapter"

const STATUS_RUNNING = JSON.stringify({
  BackendState: "Running",
  Self: { DNSName: "desktop.tailnet-abc.ts.net." },
})

const serveConfig = (proxy: string): string =>
  JSON.stringify({
    Web: {
      "desktop.tailnet-abc.ts.net:443": {
        Handlers: { "/": { Proxy: proxy } },
      },
    },
  })

const createAdapter = (run: CommandRunner) =>
  new TailscaleServeAdapter({
    targetUrl: "http://localhost:4321",
    binPath: "tailscale",
    run,
  })

const runnerFromMap = (responses: Record<string, string>): CommandRunner =>
  vi.fn(async (_command: string, args: string[]) => {
    const key = args.join(" ")
    const response = responses[key]
    if (response === undefined) {
      throw new Error(`Unexpected command: ${key}`)
    }
    return { stdout: response, stderr: "" }
  })

describe("TailscaleServeAdapter", () => {
  it("reports available, connected and active when serving the app", async () => {
    const run = runnerFromMap({
      "status --json": STATUS_RUNNING,
      "serve status --json": serveConfig("http://localhost:4321"),
    })

    const status = await createAdapter(run).getStatus()

    expect(status).toEqual({
      available: true,
      connected: true,
      active: true,
      url: "https://desktop.tailnet-abc.ts.net",
    })
  })

  it("reports unavailable when the binary is missing", async () => {
    const run = vi.fn(async () => {
      throw Object.assign(new Error("spawn tailscale ENOENT"), {
        code: "ENOENT",
      })
    })

    const status = await createAdapter(run).getStatus()

    expect(status).toEqual({
      available: false,
      connected: false,
      active: false,
      url: null,
    })
  })

  it("reports disconnected when Tailscale is not running", async () => {
    const run = vi.fn(async () => {
      throw new Error("Tailscale is stopped.")
    })

    const status = await createAdapter(run).getStatus()

    expect(status).toEqual({
      available: true,
      connected: false,
      active: false,
      url: null,
    })
  })

  it("does not mark active when serve points at a different port", async () => {
    const run = runnerFromMap({
      "status --json": STATUS_RUNNING,
      "serve status --json": serveConfig("http://localhost:9999"),
    })

    const status = await createAdapter(run).getStatus()

    expect(status.active).toBe(false)
  })

  it("enables by running serve --bg with the target and returns fresh status", async () => {
    const run = runnerFromMap({
      "status --json": STATUS_RUNNING,
      "serve status --json": serveConfig("http://localhost:4321"),
      "serve --bg --yes --https=443 http://localhost:4321": "Available",
    })

    const status = await createAdapter(run).enable()

    expect(run).toHaveBeenCalledWith(
      "tailscale",
      ["serve", "--bg", "--yes", "--https=443", "http://localhost:4321"],
      expect.objectContaining({ timeoutMs: expect.any(Number) }),
    )
    expect(status.active).toBe(true)
  })

  it("throws TunnelCommandError with the command stderr when enabling fails", async () => {
    const run = runnerFromMap({
      "status --json": STATUS_RUNNING,
      "serve status --json": "{}",
    })
    const failingRun: CommandRunner = async (command, args) => {
      const key = args.join(" ")
      if (key.startsWith("serve --bg")) {
        throw Object.assign(new Error("exit 1"), {
          stderr: "error: HTTPS must be enabled for serve",
        })
      }
      return run(command, args)
    }

    await expect(createAdapter(failingRun).enable()).rejects.toThrow(
      TunnelCommandError,
    )
    await expect(createAdapter(failingRun).enable()).rejects.toThrow(
      "HTTPS must be enabled",
    )
  })

  it("disables an active server and reports the fresh status", async () => {
    let active = true
    const calls: string[] = []
    const run: CommandRunner = async (_command, args) => {
      const key = args.join(" ")
      calls.push(key)
      if (key === "status --json") {
        return { stdout: STATUS_RUNNING, stderr: "" }
      }
      if (key === "serve status --json") {
        return {
          stdout: active ? serveConfig("http://localhost:4321") : "{}",
          stderr: "",
        }
      }
      if (key === "serve --yes --https=443 off") {
        active = false
        return { stdout: "", stderr: "" }
      }
      throw new Error(`Unexpected command: ${key}`)
    }

    const status = await createAdapter(run).disable()

    expect(calls).toContain("serve --yes --https=443 off")
    expect(status.active).toBe(false)
  })

  it("does not run serve off when it is not active", async () => {
    const run = runnerFromMap({
      "status --json": STATUS_RUNNING,
      "serve status --json": "{}",
    })

    const status = await createAdapter(run).disable()

    expect(status.active).toBe(false)
    expect(run).not.toHaveBeenCalledWith(
      "tailscale",
      expect.arrayContaining(["off"]),
    )
  })

  it("reports the consent URL when Serve is not enabled on the tailnet", async () => {
    const run = runnerFromMap({
      "status --json": STATUS_RUNNING,
      "serve status --json": "{}",
    })
    const failingRun: CommandRunner = async (command, args, options) => {
      const key = args.join(" ")
      if (key.startsWith("serve --bg")) {
        const error = new Error("Command failed with exit code null") as Error & {
          stdout?: string
        }
        error.stdout =
          "Serve is not enabled on your tailnet.\nTo enable, visit:\n\n         https://login.tailscale.com/f/serve?node=ABC123\n"
        throw error
      }
      return run(command, args, options)
    }

    await expect(createAdapter(failingRun).enable()).rejects.toThrow(
      TunnelServeNotEnabledError,
    )
    await expect(createAdapter(failingRun).enable()).rejects.toThrow(
      "https://login.tailscale.com/f/serve?node=ABC123",
    )
  })

  it("falls back to the DNS admin URL when the marker has no link", async () => {
    const run = runnerFromMap({
      "status --json": STATUS_RUNNING,
      "serve status --json": "{}",
    })
    const failingRun: CommandRunner = async (command, args, options) => {
      const key = args.join(" ")
      if (key.startsWith("serve --bg")) {
        const error = new Error("Command failed with exit code null") as Error & {
          stderr?: string
        }
        error.stderr = "Serve is not enabled on your tailnet."
        throw error
      }
      return run(command, args, options)
    }

    await expect(createAdapter(failingRun).enable()).rejects.toThrow(
      "https://login.tailscale.com/admin/dns",
    )
  })
})
