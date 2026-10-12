import { useEffect, useState } from "react"

/** `beforeinstallprompt` captured by the inline script in `base.astro`. */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    __rmInstallPrompt?: InstallPromptEvent | null
  }
}

export interface InstallPromptState {
  /** The browser offered its native install flow and it was captured. */
  canPrompt: boolean
  /** iOS Safari never fires the event: it is added from the Share menu. */
  isIos: boolean
  /** The app already runs installed (standalone window). */
  installed: boolean
  /** Opens the native prompt; resolves to whether the user accepted. */
  promptInstall: () => Promise<boolean>
}

const INSTALL_READY_EVENT = "rm:install-ready"

/** iPadOS reports itself as a Mac; touch points tell them apart. */
export const isIosDevice = (
  userAgent: string,
  maxTouchPoints: number,
): boolean =>
  /iphone|ipad|ipod/i.test(userAgent) ||
  (userAgent.includes("Macintosh") && maxTouchPoints > 1)

export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false
  const displayStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  const iosStandalone =
    (window.navigator as { standalone?: boolean }).standalone === true
  return displayStandalone || iosStandalone
}

/**
 * Install state for the PWA entry points. The prompt is captured by an inline
 * script because the event can fire before React hydrates; the values only
 * turn true after mount, so server and first client render agree.
 */
export function useInstallPrompt(): InstallPromptState {
  const [canPrompt, setCanPrompt] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!active) return
      setIsIos(
        isIosDevice(window.navigator.userAgent, window.navigator.maxTouchPoints),
      )
      setInstalled(isStandalone())
      setCanPrompt(Boolean(window.__rmInstallPrompt))
    })()

    const refresh = () => {
      setInstalled(isStandalone())
      setCanPrompt(Boolean(window.__rmInstallPrompt))
    }
    window.addEventListener(INSTALL_READY_EVENT, refresh)
    window.addEventListener("appinstalled", refresh)
    return () => {
      active = false
      window.removeEventListener(INSTALL_READY_EVENT, refresh)
      window.removeEventListener("appinstalled", refresh)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    const event = window.__rmInstallPrompt
    if (!event) return false
    window.__rmInstallPrompt = null
    await event.prompt()
    const choice = await event.userChoice
    setCanPrompt(false)
    return choice.outcome === "accepted"
  }

  return { canPrompt, isIos, installed, promptInstall }
}
