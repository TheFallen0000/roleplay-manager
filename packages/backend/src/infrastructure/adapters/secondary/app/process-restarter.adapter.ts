import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

import type { AppRestarter } from "../../../../domain/ports/app-restarter"

type Execve = (
  file: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) => void

export interface ProcessRestarterOptions {
  /** Portable root (it contains the `start.cmd` launcher). */
  packagedRoot?: string
  /** Injectable for tests. */
  spawnImpl?: typeof spawn
  /** Injectable for tests. */
  exit?: (code: number) => void
  /** POSIX `process.execve` replacement; injectable for tests. */
  execveImpl?: Execve | null
}

/** Time to let the HTTP response reach the browser before exiting. */
const EXIT_DELAY_MS = 700

const IS_WINDOWS = process.platform === "win32"
const LAUNCHER_FILE = IS_WINDOWS ? "start.cmd" : "start.sh"

/**
 * Restarts the packaged app by replacing this process with its launcher on
 * POSIX (`execve`), or by spawning it attached to the same console on Windows.
 * The launcher re-reads the `current` pointer, so the freshly installed version
 * is the one that starts.
 *
 * Staying attached keeps Ctrl+C and closing the terminal working; a detached
 * child used to survive both and leave an orphan process.
 *
 * The browser is not reopened: the tab that requested the restart reconnects on
 * its own. `RM_NO_BROWSER` tells the launcher not to ask for a browser, and the
 * inherited `RM_OPEN_BROWSER` is dropped so the new server cannot open one
 * either.
 */
export class ProcessRestarter implements AppRestarter {
  private readonly root: string | undefined
  private readonly spawnImpl: typeof spawn
  private readonly exit: (code: number) => void
  private readonly execveImpl: Execve | undefined

  constructor(options: ProcessRestarterOptions) {
    this.root = options.packagedRoot
    this.spawnImpl = options.spawnImpl ?? spawn
    this.exit = options.exit ?? ((code) => process.exit(code))
    this.execveImpl =
      options.execveImpl === undefined
        ? (process.execve as Execve | undefined)
        : (options.execveImpl ?? undefined)
  }

  available(): boolean {
    return Boolean(this.root && existsSync(join(this.root, LAUNCHER_FILE)))
  }

  restart(): void {
    if (!this.available() || !this.root) {
      throw new Error("The app is not packaged; it cannot restart itself.")
    }

    const env: NodeJS.ProcessEnv = { ...process.env, RM_NO_BROWSER: "1" }
    delete env.RM_OPEN_BROWSER

    // On POSIX, replacing this process keeps the same PID, session, TTY and
    // foreground process group, so Ctrl+C and closing the terminal still work.
    if (!IS_WINDOWS && this.execveImpl) {
      const execve = this.execveImpl
      const launcher = join(this.root, LAUNCHER_FILE)
      setTimeout(() => {
        try {
          execve("/bin/sh", ["sh", launcher], env)
        } catch {
          this.spawnLauncher(env)
          setTimeout(() => this.exit(0), EXIT_DELAY_MS)
        }
      }, EXIT_DELAY_MS)
      return
    }

    this.spawnLauncher(env)
    setTimeout(() => this.exit(0), EXIT_DELAY_MS)
  }

  private spawnLauncher(env: NodeJS.ProcessEnv): void {
    if (!this.root) return
    const child = IS_WINDOWS
      ? this.spawnImpl(
          process.env.ComSpec ?? "cmd.exe",
          ["/d", "/s", "/c", LAUNCHER_FILE],
          {
            cwd: this.root,
            env,
            detached: false,
            stdio: "inherit",
          },
        )
      : this.spawnImpl("sh", [join(this.root, LAUNCHER_FILE)], {
          cwd: this.root,
          env,
          detached: false,
          stdio: "inherit",
        })
    child.unref()
  }
}
