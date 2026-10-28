import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { ProcessRestarter } from "./process-restarter.adapter"

const LAUNCHER = process.platform === "win32" ? "start.cmd" : "start.sh"

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "rm-restarter-"))
  await writeFile(join(root, LAUNCHER), "launcher\n", "utf8")
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

  it.skipIf(process.platform === "win32")(
    "replaces the process with the launcher and keeps the terminal attached",
    () => {
      vi.useFakeTimers()
      // The running process was started by the launcher, so it carries the
      // "open the browser" order: the restart must not forward it.
      vi.stubEnv("RM_OPEN_BROWSER", "http://localhost:3001")
      try {
        const execve = vi.fn()
        const spawnImpl = vi.fn()
        const exit = vi.fn()

        new ProcessRestarter({
          packagedRoot: root,
          execveImpl: execve,
          spawnImpl: spawnImpl as never,
          exit,
        }).restart()

        expect(spawnImpl).not.toHaveBeenCalled()
        expect(exit).not.toHaveBeenCalled()

        vi.runAllTimers()

        expect(execve).toHaveBeenCalledWith(
          "/bin/sh",
          ["sh", join(root, LAUNCHER)],
          expect.objectContaining({ RM_NO_BROWSER: "1" }),
        )
        const env = execve.mock.calls[0][2] as NodeJS.ProcessEnv
        expect(env.RM_OPEN_BROWSER).toBeUndefined()
        expect(exit).not.toHaveBeenCalled()
      } finally {
        vi.unstubAllEnvs()
        vi.useRealTimers()
      }
    },
  )

  it("spawns an attached launcher when execve is unavailable and exits", () => {
    vi.useFakeTimers()
    vi.stubEnv("RM_OPEN_BROWSER", "http://localhost:3001")
    try {
      const on = vi.fn()
      const unref = vi.fn()
      const spawnImpl = vi.fn(() => ({ on, unref }))
      const exit = vi.fn()

      new ProcessRestarter({
        packagedRoot: root,
        execveImpl: null,
        spawnImpl: spawnImpl as never,
        exit,
      }).restart()

      expect(spawnImpl).toHaveBeenCalledWith(
        expect.any(String),
        process.platform === "win32"
          ? ["/d", "/s", "/c", LAUNCHER]
          : [join(root, LAUNCHER)],
        expect.objectContaining({
          cwd: root,
          detached: false,
          stdio: "inherit",
        }),
      )

      const options = (spawnImpl.mock.calls[0] as unknown[])[2] as {
        env: NodeJS.ProcessEnv
      }
      expect(options.env.RM_NO_BROWSER).toBe("1")
      expect(options.env.RM_OPEN_BROWSER).toBeUndefined()

      expect(unref).toHaveBeenCalledTimes(1)
      expect(exit).not.toHaveBeenCalled()

      vi.runAllTimers()
      expect(exit).toHaveBeenCalledWith(0)
    } finally {
      vi.unstubAllEnvs()
      vi.useRealTimers()
    }
  })

  it("throws when it cannot restart itself", () => {
    expect(() => new ProcessRestarter({}).restart()).toThrow()
  })
})
