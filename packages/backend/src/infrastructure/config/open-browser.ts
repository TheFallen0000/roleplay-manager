import { spawn } from "node:child_process"

export interface BrowserCommand {
  command: string
  args: string[]
  /**
   * Windows only: hand the arguments to `cmd.exe` verbatim. Node escapes inner
   * quotes with backslashes, which `cmd.exe` does not understand, so `start`
   * would get a broken argument and Windows would report a missing file.
   */
  windowsVerbatimArguments?: boolean
}

/**
 * Command that opens a URL in the default browser for a given platform.
 * Pure so it can be tested without spawning anything.
 */
export const browserCommand = (
  url: string,
  platform: NodeJS.Platform = process.platform,
): BrowserCommand => {
  if (platform === "win32") {
    // `start` is a cmd builtin; the empty first argument is the window title.
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", `start "" "${url}"`],
      windowsVerbatimArguments: true,
    }
  }
  if (platform === "darwin") {
    return { command: "open", args: [url] }
  }
  return { command: "xdg-open", args: [url] }
}

/** Environment slice the browser logic cares about (easy to pass and test). */
export interface BrowserEnv {
  RM_OPEN_BROWSER?: string
  RM_NO_BROWSER?: string
}

/**
 * URL the app should open in the browser once it is listening, or `undefined`
 * when it must not open anything.
 *
 * `RM_NO_BROWSER` wins over `RM_OPEN_BROWSER`: a restart inherits the latter
 * from the process that is going away, and the browser tab that asked for the
 * restart reloads itself.
 */
export const browserUrlToOpen = (env: BrowserEnv): string | undefined =>
  env.RM_NO_BROWSER ? undefined : env.RM_OPEN_BROWSER || undefined

/**
 * Opens a URL in the user's default browser. Best effort: it never throws, and
 * failures are reported through `onError` (the app must keep working even when
 * no browser can be opened).
 */
export const openBrowser = (
  url: string,
  onError: (error: unknown) => void,
  spawnImpl: typeof spawn = spawn,
): void => {
  const { command, args, windowsVerbatimArguments } = browserCommand(url)
  const child = spawnImpl(command, args, {
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments,
  })
  child.on("error", onError)
  child.unref()
}
