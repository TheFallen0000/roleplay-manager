import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { UpdateDirtyWorktreeError } from "../../../../domain/errors"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildUpdateRouter } from "./update.routes"

const status = {
  currentVersion: "1.0.0",
  latestVersion: "2.0.0",
  behind: true,
  commits: ["bbbbbbb feat: something"],
  notes: null,
  canApply: true,
  canRestart: false,
  blockedReason: null,
  checkError: null,
  checkedAt: "2026-10-07T10:00:00.000Z",
  job: null,
}

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

describe("update routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    deps: Parameters<typeof buildUpdateRouter>[0],
  ): Promise<string> => {
    const app = express()
    app.use(express.json())
    app.use(buildUpdateRouter(deps))
    app.use(buildErrorHandler(fakeLogger as never))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  const unused = { execute: vi.fn() } as never

  it("returns the update status", async () => {
    const execute = vi.fn(async () => status)
    const base = await start({
      getUpdateStatus: { execute } as never,
      checkUpdates: unused,
      applyUpdate: unused,
      createBackup: unused,
      restartApp: unused,
    })

    const response = await fetch(`${base}/updates`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(status)
  })

  it("checks for updates", async () => {
    const execute = vi.fn(async () => status)
    const base = await start({
      getUpdateStatus: unused,
      checkUpdates: { execute } as never,
      applyUpdate: unused,
      createBackup: unused,
      restartApp: unused,
    })

    const response = await fetch(`${base}/updates/check`, { method: "POST" })

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("applies the update with the backup flag (defaults to true)", async () => {
    const execute = vi.fn(async () => ({
      ...status,
      job: { running: true, step: "pull", message: null },
    }))
    const base = await start({
      getUpdateStatus: unused,
      checkUpdates: unused,
      applyUpdate: { execute } as never,
      createBackup: unused,
      restartApp: unused,
    })

    await fetch(`${base}/updates/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(execute).toHaveBeenCalledWith({ withBackup: true })

    await fetch(`${base}/updates/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ withBackup: false }),
    })
    expect(execute).toHaveBeenLastCalledWith({ withBackup: false })
  })

  it("creates a backup", async () => {
    const execute = vi.fn(async () => ({
      path: "/tmp/backup",
      files: 3,
      bytes: 30,
    }))
    const base = await start({
      getUpdateStatus: unused,
      checkUpdates: unused,
      applyUpdate: unused,
      createBackup: { execute } as never,
      restartApp: unused,
    })

    const response = await fetch(`${base}/updates/backup`, { method: "POST" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      path: "/tmp/backup",
      files: 3,
      bytes: 30,
    })
  })

  it("restarts the app", async () => {
    const execute = vi.fn(() => ({ restarting: true }))
    const base = await start({
      getUpdateStatus: unused,
      checkUpdates: unused,
      applyUpdate: unused,
      createBackup: unused,
      restartApp: { execute } as never,
    })

    const response = await fetch(`${base}/updates/restart`, { method: "POST" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ restarting: true })
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("maps a dirty worktree error to 409 with its code", async () => {
    const execute = vi.fn(async () => {
      throw new UpdateDirtyWorktreeError()
    })
    const base = await start({
      getUpdateStatus: unused,
      checkUpdates: unused,
      applyUpdate: { execute } as never,
      createBackup: unused,
      restartApp: unused,
    })

    const response = await fetch(`${base}/updates/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: "UPDATE_DIRTY_WORKTREE",
        message: "The working tree has local changes; commit or stash them first.",
      },
    })
  })
})
