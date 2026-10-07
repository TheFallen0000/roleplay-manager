import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { ProcessRestarter } from "./process-restarter.adapter"

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "rm-restarter-"))
  await writeFile(join(root, "start.cmd"), "@echo off\r\n", "utf8")
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe("ProcessRestarter", () => {
  it("is available when the packaged launcher exists", () => {
    expect(new ProcessRestarter({ packagedRoot: root }).available()).toBe(true)
  })

  it("is not available without a packaged root or launcher", () => {
    expect(new ProcessRestarter({}).available()).toBe(false)
    expect(
      new ProcessRestarter({ packagedRoot: join(root, "missing") }).available(),
    ).toBe(false)
  })

  it("relaunches the launcher (without the browser) and exits", () => {
    vi.useFakeTimers()
    try {
      const on = vi.fn()
      const unref = vi.fn()
      const spawnImpl = vi.fn(() => ({ on, unref }))
      const exit = vi.fn()

      new ProcessRestarter({
        packagedRoot: root,
        spawnImpl: spawnImpl as never,
        exit,
      }).restart()

      expect(spawnImpl).toHaveBeenCalledWith(
        expect.any(String),
        ["/d", "/s", "/c", "start.cmd"],
        expect.objectContaining({
          cwd: root,
          detached: true,
          stdio: "ignore",
          env: expect.objectContaining({ RM_NO_BROWSER: "1" }),
        }),
      )
      expect(unref).toHaveBeenCalledTimes(1)
      expect(exit).not.toHaveBeenCalled()

      vi.runAllTimers()
      expect(exit).toHaveBeenCalledWith(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it("throws when it cannot restart itself", () => {
    expect(() => new ProcessRestarter({}).restart()).toThrow()
  })
})
