import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import type {
  BackupResultDTO,
  UpdateJobDTO,
  UpdateJobStep,
  UpdateStatusDTO,
} from "@workspace/shared/types/update"

import {
  UpdateDirtyWorktreeError,
  UpdateFailedError,
  UpdateNotARepoError,
} from "../../../../domain/errors"
import type { UpdateController } from "../../../../domain/ports/update-controller"

export interface CommandResult {
  stdout: string
  stderr: string
}

export type CommandRunner = (
  command: string,
  args: string[],
  cwd: string,
) => Promise<CommandResult>

export interface GitUpdateAdapterOptions {
  /** Working directory of the app checkout. */
  repoDir: string
  /** Branch to follow (defaults to the current one). */
  branch?: string
  /** Git remote (defaults to `origin`). */
  remote?: string
  /** Git binary (defaults to `git`). */
  gitBin?: string
  /** Run `pnpm install` after pulling (defaults to true). */
  install?: boolean
  /** Injectable for tests. */
  run?: CommandRunner
  /** Creates the backup used by `apply({ withBackup: true })`. */
  backup?: () => Promise<BackupResultDTO>
}

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000
const MAX_COMMITS = 10
const FALLBACK_VERSION = "0.0.0"

/**
 * Updates the app from its git checkout: compares the local commit with the
 * tracked branch, lists the new commits and applies the update with
 * `git pull --ff-only` (plus `pnpm install`).
 */
export class GitUpdateAdapter implements UpdateController {
  private readonly repoDir: string
  private readonly remote: string
  private readonly gitBin: string
  private readonly branch: string | undefined
  private readonly install: boolean
  private readonly run: CommandRunner
  private readonly backup: (() => Promise<BackupResultDTO>) | undefined
  private status: UpdateStatusDTO | null = null
  private job: UpdateJobDTO | null = null

  constructor(options: GitUpdateAdapterOptions) {
    this.repoDir = options.repoDir
    this.remote = options.remote ?? "origin"
    this.gitBin = options.gitBin ?? "git"
    this.branch = options.branch
    this.install = options.install ?? true
    this.run = options.run ?? defaultRunner
    this.backup = options.backup
  }

  async getStatus(): Promise<UpdateStatusDTO> {
    const base = this.status ?? emptyStatus(await this.localVersion())
    return { ...base, job: this.job }
  }

  async check(): Promise<UpdateStatusDTO> {
    const base: UpdateStatusDTO = {
      ...emptyStatus(await this.localVersion()),
      checkedAt: new Date().toISOString(),
    }

    if (!(await this.isRepo())) {
      this.status = { ...base, blockedReason: "not-a-repo" }
      return this.getStatus()
    }

    const branch = await this.resolveBranch()
    try {
      await this.git(["fetch", this.remote, branch])
    } catch (error) {
      this.status = { ...base, checkError: describeError(error) }
      return this.getStatus()
    }

    const ref = `${this.remote}/${branch}`
    const head = (await this.git(["rev-parse", "HEAD"])).stdout.trim()
    const remoteHead = (await this.git(["rev-parse", ref])).stdout.trim()
    const behind = head !== remoteHead

    let latestVersion: string | null = await this.localVersion()
    let commits: string[] = []
    if (behind) {
      latestVersion = await this.remoteVersion(ref)
      commits = (await this.git(["log", "--oneline", "--no-decorate", `HEAD..${ref}`]))
        .stdout.split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, MAX_COMMITS)
    }

    const dirty = (await this.git(["status", "--porcelain"])).stdout.trim().length > 0

    this.status = {
      ...base,
      latestVersion,
      behind,
      commits,
      canApply: behind && !dirty && !(this.job?.running ?? false),
      blockedReason: behind && dirty ? "dirty" : null,
    }
    return this.getStatus()
  }

  async apply({ withBackup }: { withBackup: boolean }): Promise<UpdateStatusDTO> {
    if (this.job?.running) {
      throw new UpdateFailedError("An update is already running.")
    }

    const status = this.status ?? (await this.check())
    if (status.blockedReason === "not-a-repo") {
      throw new UpdateNotARepoError()
    }
    if (status.blockedReason === "dirty") {
      throw new UpdateDirtyWorktreeError()
    }
    if (!status.behind) {
      throw new UpdateFailedError("There are no updates to apply.")
    }

    const useBackup = withBackup && this.backup !== undefined
    this.job = {
      running: true,
      step: useBackup ? "backup" : "pull",
      message: null,
    }
    void this.runJob(useBackup)
    return this.getStatus()
  }

  async createBackup(): Promise<BackupResultDTO> {
    if (!this.backup) {
      throw new UpdateFailedError("Backups are not available.")
    }
    return this.backup()
  }

  private async runJob(withBackup: boolean): Promise<void> {
    try {
      if (withBackup && this.backup) {
        this.setJob("backup")
        await this.backup()
      }

      const branch = await this.resolveBranch()
      this.setJob("pull")
      await this.git(["pull", "--ff-only", this.remote, branch])

      if (this.install) {
        this.setJob("install")
        const install = installCommand()
        await this.run(install.command, install.args, this.repoDir)
      }

      await this.check()
      this.setJob("done")
    } catch (error) {
      this.setJob("failed", describeError(error))
    }
  }

  private setJob(step: UpdateJobStep, message: string | null = null): void {
    this.job = {
      running: step !== "done" && step !== "failed",
      step,
      message,
    }
  }

  private git(args: string[]): Promise<CommandResult> {
    return this.run(this.gitBin, args, this.repoDir)
  }

  private async isRepo(): Promise<boolean> {
    try {
      const result = await this.git(["rev-parse", "--is-inside-work-tree"])
      return result.stdout.trim() === "true"
    } catch {
      return false
    }
  }

  private async resolveBranch(): Promise<string> {
    if (this.branch) return this.branch
    const result = await this.git(["rev-parse", "--abbrev-ref", "HEAD"])
    return result.stdout.trim()
  }

  private async localVersion(): Promise<string> {
    return readVersion(join(this.repoDir, "package.json"))
  }

  private async remoteVersion(ref: string): Promise<string | null> {
    try {
      const result = await this.git(["show", `${ref}:package.json`])
      const parsed = JSON.parse(stripBom(result.stdout)) as { version?: string }
      return parsed.version ?? null
    } catch {
      return null
    }
  }
}

const emptyStatus = (currentVersion: string): UpdateStatusDTO => ({
  currentVersion,
  latestVersion: null,
  behind: false,
  commits: [],
  notes: null,
  canApply: false,
  blockedReason: null,
  checkError: null,
  checkedAt: null,
  job: null,
})

const readVersion = async (packageJsonPath: string): Promise<string> => {
  try {
    const raw = await readFile(packageJsonPath, "utf8")
    const parsed = JSON.parse(stripBom(raw)) as { version?: string }
    return parsed.version ?? FALLBACK_VERSION
  } catch {
    return FALLBACK_VERSION
  }
}

/** Some editors write a UTF-8 BOM; JSON.parse rejects it. */
const stripBom = (raw: string): string => raw.replace(/^\uFEFF/, "")

/** Runs `pnpm install` cross-platform (avoids the Windows `.cmd` shim). */
const installCommand = (): { command: string; args: string[] } => {
  const execPath = process.env.npm_execpath
  if (execPath && execPath.endsWith(".cjs")) {
    return { command: process.execPath, args: [execPath, "install"] }
  }
  if (process.platform === "win32") {
    return { command: "cmd.exe", args: ["/d", "/s", "/c", "pnpm install"] }
  }
  return { command: "pnpm", args: ["install"] }
}

const defaultRunner: CommandRunner = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      timeout: COMMAND_TIMEOUT_MS,
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
      const error = new Error(
        `Command failed with exit code ${code}`,
      ) as Error & { stdout?: string; stderr?: string }
      error.stdout = stdout
      error.stderr = stderr
      reject(error)
    })
  })

const describeError = (error: unknown): string => {
  const stderr = (error as { stderr?: string } | undefined)?.stderr?.trim()
  if (stderr) return stderr
  return (error as Error).message
}
