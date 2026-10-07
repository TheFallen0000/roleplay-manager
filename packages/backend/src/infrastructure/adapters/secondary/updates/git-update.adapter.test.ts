import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { UpdateStatusDTO } from "@workspace/shared/types/update"

import {
  UpdateDirtyWorktreeError,
  UpdateFailedError,
  UpdateNotARepoError,
} from "../../../../domain/errors"
import {
  GitUpdateAdapter,
  type CommandResult,
  type CommandRunner,
} from "./git-update.adapter"

let repoDir: string

beforeAll(async () => {
  repoDir = await mkdtemp(join(tmpdir(), "rm-update-"))
  await writeFile(
    join(repoDir, "package.json"),
    JSON.stringify({ version: "1.0.0" }),
    "utf8",
  )
})

afterAll(async () => {
  await rm(repoDir, { recursive: true, force: true })
})

const behindMap: Record<string, string> = {
  "git rev-parse --is-inside-work-tree": "true\n",
  "git rev-parse --abbrev-ref HEAD": "master\n",
  "git fetch origin master": "",
  "git rev-parse HEAD": "aaaaaaa\n",
  "git rev-parse origin/master": "bbbbbbb\n",
  "git log --oneline --no-decorate HEAD..origin/master":
    "bbbbbbb feat: add something\naaaaaaa previous work\n",
  "git status --porcelain": "",
  "git show origin/master:package.json": '{"version":"2.0.0"}',
}

const runnerFromMap = (
  map: Record<string, string>,
  onCall?: (key: string) => void,
): CommandRunner =>
  vi.fn(async (command: string, args: string[]): Promise<CommandResult> => {
    const key = `${command} ${args.join(" ")}`
    onCall?.(key)
    const stdout = map[key]
    if (stdout === undefined) {
      throw Object.assign(new Error(`Unexpected command: ${key}`), {
        stderr: `unexpected: ${key}`,
      })
    }
    return { stdout, stderr: "" }
  })

const buildAdapter = (run: CommandRunner, install = false) =>
  new GitUpdateAdapter({
    repoDir,
    run,
    install,
    backup: async () => ({ path: "/tmp/backup", files: 1, bytes: 10 }),
  })

const waitForJob = async (adapter: GitUpdateAdapter): Promise<UpdateStatusDTO> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const status = await adapter.getStatus()
    if (status.job && !status.job.running) return status
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error("job did not finish")
}

describe("GitUpdateAdapter", () => {
  it("detects new commits, versions and that it can apply", async () => {
    const status = await buildAdapter(runnerFromMap(behindMap)).check()

    expect(status.currentVersion).toBe("1.0.0")
    expect(status.latestVersion).toBe("2.0.0")
    expect(status.behind).toBe(true)
    expect(status.commits).toHaveLength(2)
    expect(status.canApply).toBe(true)
    expect(status.blockedReason).toBeNull()
    expect(status.checkError).toBeNull()
    expect(status.checkedAt).not.toBeNull()
  })

  it("reports up to date when the remote matches HEAD", async () => {
    const map = {
      ...behindMap,
      "git rev-parse origin/master": "aaaaaaa\n",
    }
    const status = await buildAdapter(runnerFromMap(map)).check()

    expect(status.behind).toBe(false)
    expect(status.canApply).toBe(false)
    expect(status.commits).toHaveLength(0)
    expect(status.latestVersion).toBe("1.0.0")
  })

  it("blocks applying when the working tree is dirty", async () => {
    const map = { ...behindMap, "git status --porcelain": " M file.ts\n" }
    const status = await buildAdapter(runnerFromMap(map)).check()

    expect(status.behind).toBe(true)
    expect(status.canApply).toBe(false)
    expect(status.blockedReason).toBe("dirty")
  })

  it("reports not-a-repo without a check error", async () => {
    const run: CommandRunner = async () => {
      throw Object.assign(new Error("not a git repository"), {
        stderr: "fatal: not a git repository",
      })
    }
    const status = await buildAdapter(run).check()

    expect(status.blockedReason).toBe("not-a-repo")
    expect(status.canApply).toBe(false)
    expect(status.checkError).toBeNull()
  })

  it("surfaces a fetch failure as checkError", async () => {
    const map = {
      "git rev-parse --is-inside-work-tree": "true\n",
      "git rev-parse --abbrev-ref HEAD": "master\n",
    }
    const run: CommandRunner = async (command, args) => {
      const key = `${command} ${args.join(" ")}`
      if (key === "git fetch origin master") {
        throw Object.assign(new Error("fetch failed"), {
          stderr: "Could not resolve host: github.com",
        })
      }
      const stdout = map[key as keyof typeof map]
      if (stdout === undefined) throw new Error(`Unexpected command: ${key}`)
      return { stdout, stderr: "" }
    }

    const status = await buildAdapter(run).check()

    expect(status.checkError).toContain("Could not resolve host")
    expect(status.canApply).toBe(false)
  })

  it("applies the update in the background (backup + pull)", async () => {
    const calls: string[] = []
    const map = {
      ...behindMap,
      "git pull --ff-only origin master": "",
    }
    const adapter = buildAdapter(runnerFromMap(map, (key) => calls.push(key)))

    const started = await adapter.apply({ withBackup: true })
    expect(started.job?.running).toBe(true)

    const finished = await waitForJob(adapter)
    expect(finished.job).toMatchObject({ running: false, step: "done" })
    expect(calls).toContain("git pull --ff-only origin master")
  })

  it("runs the install step when enabled", async () => {
    const calls: string[] = []
    const run: CommandRunner = async (command, args) => {
      const key = `${command} ${args.join(" ")}`
      calls.push(key)
      if (key.includes("install")) return { stdout: "", stderr: "" }
      if (key === "git pull --ff-only origin master") {
        return { stdout: "", stderr: "" }
      }
      const stdout = behindMap[key]
      if (stdout === undefined) throw new Error(`Unexpected command: ${key}`)
      return { stdout, stderr: "" }
    }
    const adapter = buildAdapter(run, true)

    await adapter.apply({ withBackup: false })
    await waitForJob(adapter)

    expect(calls.some((key) => key.includes("install"))).toBe(true)
  })

  it("marks the job as failed when the pull fails", async () => {
    const run: CommandRunner = async (command, args) => {
      const key = `${command} ${args.join(" ")}`
      if (key === "git pull --ff-only origin master") {
        throw Object.assign(new Error("pull failed"), {
          stderr: "error: cannot pull with rebase",
        })
      }
      const stdout = behindMap[key]
      if (stdout === undefined) throw new Error(`Unexpected command: ${key}`)
      return { stdout, stderr: "" }
    }
    const adapter = buildAdapter(run)

    await adapter.apply({ withBackup: false })
    const finished = await waitForJob(adapter)

    expect(finished.job).toMatchObject({ running: false, step: "failed" })
    expect(finished.job?.message).toContain("cannot pull")
  })

  it("refuses to apply with a dirty tree or without updates", async () => {
    const dirty = buildAdapter(
      runnerFromMap({ ...behindMap, "git status --porcelain": " M file.ts\n" }),
    )
    await dirty.check()
    await expect(dirty.apply({ withBackup: true })).rejects.toThrow(
      UpdateDirtyWorktreeError,
    )

    const upToDate = buildAdapter(
      runnerFromMap({ ...behindMap, "git rev-parse origin/master": "aaaaaaa\n" }),
    )
    await upToDate.check()
    await expect(upToDate.apply({ withBackup: true })).rejects.toThrow(
      UpdateFailedError,
    )
  })

  it("refuses to apply when it is not a repo", async () => {
    const run: CommandRunner = async () => {
      throw new Error("not a git repository")
    }
    const adapter = buildAdapter(run)
    await adapter.check()

    await expect(adapter.apply({ withBackup: true })).rejects.toThrow(
      UpdateNotARepoError,
    )
  })

  it("delegates backups and fails when none is configured", async () => {
    const adapter = buildAdapter(runnerFromMap(behindMap))
    await expect(adapter.createBackup()).resolves.toEqual({
      path: "/tmp/backup",
      files: 1,
      bytes: 10,
    })

    const withoutBackup = new GitUpdateAdapter({
      repoDir,
      run: runnerFromMap(behindMap),
      install: false,
    })
    await expect(withoutBackup.createBackup()).rejects.toThrow(UpdateFailedError)
  })
})
