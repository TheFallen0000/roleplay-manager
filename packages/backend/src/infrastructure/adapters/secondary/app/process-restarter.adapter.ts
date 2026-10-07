import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

import type { AppRestarter } from "../../../../domain/ports/app-restarter"

export interface ProcessRestarterOptions {
  /** Portable root (it contains the `start.cmd` launcher). */
  packagedRoot?: string
  /** Injectable for tests. */
  spawnImpl?: typeof spawn
  /** Injectable for tests. */
  exit?: (code: number) => void
}

/** Time to let the HTTP response reach the browser before exiting. */
const EXIT_DELAY_MS = 700

/**
 * Restarts the packaged app by running its `start.cmd` again (detached, sharing
 * the console) and then exiting this process. The launcher re-reads the
 * `current` pointer, so the freshly installed version is the one that starts.
 *
 * The browser is not reopened (`RM_NO_BROWSER`): the tab that requested the
 * restart reconnects on its own.
 */
export class ProcessRestarter implements AppRestarter {
  private readonly root: string | undefined
  private readonly spawnImpl: typeof spawn
  private readonly exit: (code: number) => void

  constructor(options: ProcessRestarterOptions) {
    this.root = options.packagedRoot
    this.spawnImpl = options.spawnImpl ?? spawn
    this.exit = options.exit ?? ((code) => process.exit(code))
  }

  available(): boolean {
    return Boolean(
      this.root && existsSync(join(this.root, "start.cmd")),
    )
  }

  restart(): void {
    if (!this.available() || !this.root) {
      throw new Error("The app is not packaged; it cannot restart itself.")
    }

    const child = this.spawnImpl(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", "start.cmd"],
      {
        cwd: this.root,
        env: { ...process.env, RM_NO_BROWSER: "1" },
        detached: true,
        stdio: "ignore",
      },
    )
    child.unref()
    setTimeout(() => this.exit(0), EXIT_DELAY_MS)
  }
}
