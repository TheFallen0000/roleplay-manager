import { spawn } from "node:child_process"

export interface BrowserCommand {
  command: string
  args: string[]
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
    }
  }
  if (platform === "darwin") {
    return { command: "open", args: [url] }
  }
  return { command: "xdg-open", args: [url] }
}

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
  const { command, args } = browserCommand(url)
  const child = spawnImpl(command, args, { detached: true, stdio: "ignore" })
  child.on("error", onError)
  child.unref()
}
