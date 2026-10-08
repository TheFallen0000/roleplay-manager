import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { createWriteStream } from "node:fs"
import { chmod, cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as WebReadableStream } from "node:stream/web"

import type {
  BackupResultDTO,
  UpdateJobDTO,
  UpdateJobStep,
  UpdateStatusDTO,
} from "@workspace/shared/types/update"

import { UpdateFailedError } from "../../../../domain/errors"
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

export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<Response>

export interface ReleaseUpdateAdapterOptions {
  /** Portable root (contains `versions/`, `current`, `data/`, `backups/`). */
  packagedRoot: string
  /** GitHub repository as `owner/repo` (falls back to `version.json`). */
  repository?: string
  /** GitHub API base (override for tests and mirrors). */
  apiBaseUrl?: string
  /** Asset suffix that identifies the package for this platform. */
  assetSuffix?: string
  /** Injectable for tests. */
  fetchImpl?: FetchLike
  /** Injectable for tests. */
  run?: CommandRunner
  /** Creates the backup used by `apply({ withBackup: true })`. */
  backup?: () => Promise<BackupResultDTO>
}

interface ReleaseAsset {
  name: string
  browser_download_url: string
  size?: number
}

interface ReleaseInfo {
  tag_name: string
  body?: string | null
  assets: ReleaseAsset[]
}

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000
const FALLBACK_VERSION = "0.0.0"
const DEFAULT_API_BASE_URL = "https://api.github.com"
/** Network steps are retried: the first connection can fail (DNS/TLS/CDN). */
const MAX_FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 500
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

/** Launcher shipped in the package for the platform this app runs on. */
const LAUNCHER_FILE = process.platform === "win32" ? "start.cmd" : "start.sh"

/** Asset suffix of the package built for the platform this app runs on. */
const defaultAssetSuffix = (): string => {
  const os =
    process.platform === "win32"
      ? "win"
      : process.platform === "darwin"
        ? "mac"
        : "linux"
  const arch = process.arch === "arm64" ? "arm64" : "x64"
  return `-${os}-${arch}.${os === "win" ? "zip" : "tar.gz"}`
}

/**
 * Updates the packaged app from its published releases: reads the latest
 * GitHub Release, downloads the platform asset and installs it into
 * `versions/<version>`, switching the `current` pointer. The running version
 * is never touched (that is why updates need a restart) and the previous
 * version stays on disk for rollback.
 */
export class ReleaseUpdateAdapter implements UpdateController {
  private readonly root: string
  private readonly repository: string | undefined
  private readonly apiBaseUrl: string
  private readonly assetSuffix: string
  private readonly fetchImpl: FetchLike
  private readonly run: CommandRunner
  private readonly backup: (() => Promise<BackupResultDTO>) | undefined
  private status: UpdateStatusDTO | null = null
  private job: UpdateJobDTO | null = null

  constructor(options: ReleaseUpdateAdapterOptions) {
    this.root = options.packagedRoot
    this.repository = options.repository
    this.apiBaseUrl = (
      options.apiBaseUrl ?? DEFAULT_API_BASE_URL
    ).replace(/\/+$/, "")
    this.assetSuffix = options.assetSuffix ?? defaultAssetSuffix()
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike)
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

    try {
      const release = await this.fetchLatestRelease(await this.resolveRepository())
      const latestVersion = release.tag_name.replace(/^v/, "")
      const asset = release.assets.find((candidate) =>
        candidate.name.endsWith(this.assetSuffix),
      )
      const behind = isNewerVersion(latestVersion, base.currentVersion)
      const notes = release.body?.trim()

      this.status = {
        ...base,
        latestVersion,
        behind,
        notes: notes && notes.length > 0 ? notes : null,
        canApply: behind && asset !== undefined && !(this.job?.running ?? false),
        blockedReason: behind && !asset ? "no-asset" : null,
      }
    } catch (error) {
      this.status = { ...base, checkError: describeError(error) }
    }

    return this.getStatus()
  }

  async apply({ withBackup }: { withBackup: boolean }): Promise<UpdateStatusDTO> {
    if (this.job?.running) {
      throw new UpdateFailedError("An update is already running.")
    }

    const status = this.status ?? (await this.check())
    if (status.blockedReason === "no-asset") {
      throw new UpdateFailedError(
        "The latest release does not include a package for this platform.",
      )
    }
    if (!status.behind || !status.latestVersion) {
      throw new UpdateFailedError("There are no updates to apply.")
    }

    const useBackup = withBackup && this.backup !== undefined
    this.job = {
      running: true,
      step: useBackup ? "backup" : "download",
      message: null,
      retry: null,
    }
    void this.runJob(useBackup, status.latestVersion)
    return this.getStatus()
  }

  async createBackup(): Promise<BackupResultDTO> {
    if (!this.backup) {
      throw new UpdateFailedError("Backups are not available.")
    }
    return this.backup()
  }

  private async runJob(withBackup: boolean, version: string): Promise<void> {
    try {
      if (withBackup && this.backup) {
        this.setJob("backup")
        await this.backup()
      }

      const release = await this.fetchLatestRelease(await this.resolveRepository())
      const asset = release.assets.find((candidate) =>
        candidate.name.endsWith(this.assetSuffix),
      )
      if (!asset) {
        throw new UpdateFailedError(
          "The latest release does not include a package for this platform.",
        )
      }

      this.setJob("download")
      const downloadPath = join(this.root, "versions", `.download-${version}.zip`)
      await mkdir(join(this.root, "versions"), { recursive: true })
      await this.download(asset, downloadPath)

      this.setJob("install")
      await this.install(version, downloadPath)

      await this.check()
      this.setJob("done")
    } catch (error) {
      this.setJob("failed", describeError(error))
    }
  }

  private async download(asset: ReleaseAsset, target: string): Promise<void> {
    const response = await this.fetchWithRetry(asset.browser_download_url, {
      headers: { "user-agent": "roleplay-manager-updater" },
    })
    if (!response.ok || !response.body) {
      throw new UpdateFailedError(
        `Could not download the update (HTTP ${response.status}).`,
      )
    }

    const total = Number(
      response.headers.get("content-length") ?? asset.size ?? 0,
    )
    let received = 0
    let lastReported = 0
    const progress = new Transform({
      transform: (chunk, _encoding, callback) => {
        const size = (chunk as Buffer).length
        received += size
        if (total > 0 && received - lastReported >= total / 20) {
          lastReported = received
          this.reportDownload(received, total)
        }
        callback(null, chunk)
      },
    })

    await pipeline(
      Readable.fromWeb(response.body as unknown as WebReadableStream),
      progress,
      createWriteStream(target),
    )
  }

  private async install(version: string, zipPath: string): Promise<void> {
    const versionsDir = join(this.root, "versions")
    const staging = join(versionsDir, `.staging-${version}`)
    const target = join(versionsDir, version)

    await rm(staging, { recursive: true, force: true })
    await mkdir(staging, { recursive: true })

    try {
      await this.run("tar", ["-x", "-f", zipPath, "-C", staging], this.root)

      const stagedVersion = join(staging, "versions", version)
      if (!existsSync(join(stagedVersion, "app", "server.mjs"))) {
        throw new UpdateFailedError(
          "The downloaded package does not contain the expected app.",
        )
      }

      await rm(target, { recursive: true, force: true })
      await rename(stagedVersion, target)

      // Refresh the root launcher and metadata when the package ships new ones.
      for (const file of [LAUNCHER_FILE, "README.txt", "version.json"]) {
        const source = join(staging, file)
        if (!existsSync(source)) continue
        const target = join(this.root, file)
        await cp(source, target)
        if (file === LAUNCHER_FILE && process.platform !== "win32") {
          await chmod(target, 0o755)
        }
      }

      await writeFile(join(this.root, "current"), version, "utf8")
    } finally {
      await rm(staging, { recursive: true, force: true })
      await rm(zipPath, { force: true })
    }
  }

  /**
   * `fetch` with retries for transient failures (network errors and 5xx/408/429
   * responses). The first connection to a CDN can fail on a cold DNS/TLS state.
   */
  private async fetchWithRetry(
    input: string,
    init?: { headers?: Record<string, string> },
  ): Promise<Response> {
    let lastError: unknown
    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.fetchImpl(input, init)
        if (
          attempt < MAX_FETCH_ATTEMPTS &&
          RETRYABLE_STATUSES.has(response.status)
        ) {
          lastError = new UpdateFailedError(`HTTP ${response.status}`)
          await this.waitBeforeRetry(attempt)
          continue
        }
        return response
      } catch (error) {
        lastError = error
        if (attempt >= MAX_FETCH_ATTEMPTS) break
        await this.waitBeforeRetry(attempt)
      }
    }
    throw new UpdateFailedError(describeError(lastError))
  }

  private waitBeforeRetry(attempt: number): Promise<void> {
    const job = this.job
    if (job?.running) {
      this.job = { ...job, retry: { attempt, attempts: MAX_FETCH_ATTEMPTS } }
    }
    return delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
  }

  private reportDownload(received: number, total: number): void {
    this.job = {
      running: true,
      step: "download",
      message: `${formatBytes(received)} / ${formatBytes(total)}`,
      retry: null,
    }
  }

  private setJob(step: UpdateJobStep, message: string | null = null): void {
    this.job = {
      running: step !== "done" && step !== "failed",
      step,
      message,
      retry: null,
    }
  }

  private async resolveRepository(): Promise<string> {
    if (this.repository) return this.repository
    try {
      const raw = await readFile(join(this.root, "version.json"), "utf8")
      const parsed = JSON.parse(stripBom(raw)) as { repository?: string }
      if (parsed.repository) return parsed.repository
    } catch {
      // Fall through to the error below.
    }
    throw new UpdateFailedError("The update repository is not configured.")
  }

  private async fetchLatestRelease(repository: string): Promise<ReleaseInfo> {
    const response = await this.fetchWithRetry(
      `${this.apiBaseUrl}/repos/${repository}/releases/latest`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "roleplay-manager-updater",
        },
      },
    )
    if (!response.ok) {
      throw new UpdateFailedError(
        `Could not read the latest release (HTTP ${response.status}).`,
      )
    }

    const release = (await response.json()) as ReleaseInfo
    if (!release.tag_name) {
      throw new UpdateFailedError("The latest release has no tag.")
    }
    return release
  }

  private async localVersion(): Promise<string> {
    try {
      const raw = await readFile(join(this.root, "current"), "utf8")
      return raw.trim() || FALLBACK_VERSION
    } catch {
      return FALLBACK_VERSION
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
  // This adapter only runs from the packaged app (launcher present).
  canRestart: true,
  blockedReason: null,
  checkError: null,
  checkedAt: null,
  job: null,
})

/** Some editors write a UTF-8 BOM; JSON.parse rejects it. */
const stripBom = (raw: string): string => raw.replace(/^\uFEFF/, "")

const formatBytes = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(1)} MB`

/**
 * Numeric version comparison, so a lower tag is never offered as an update
 * and equal versions do not look "behind".
 */
const isNewerVersion = (candidate: string, current: string): boolean => {
  const parse = (value: string): number[] =>
    value
      .split(/[.+-]/)
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isNaN(part) ? 0 : part))
  const left = parse(candidate)
  const right = parse(current)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    if (a !== b) return a > b
  }
  return false
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

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Flattens an error and its `cause` chain (`fetch` hides the real reason there). */
const errorMessages = (error: unknown, depth = 0): string[] => {
  if (error == null || depth > 4) return []
  if (error instanceof AggregateError) {
    return error.errors.flatMap((inner) => errorMessages(inner, depth + 1))
  }
  if (error instanceof Error) {
    const own = error.message ? [error.message] : []
    const cause = (error as { cause?: unknown }).cause
    return [...own, ...errorMessages(cause, depth + 1)]
  }
  return [String(error)]
}

const describeError = (error: unknown): string => {
  const stderr = (error as { stderr?: string } | undefined)?.stderr?.trim()
  if (stderr) return stderr
  const messages = [...new Set(errorMessages(error))]
  return messages.length > 0 ? messages.join(": ") : "unknown error"
}
