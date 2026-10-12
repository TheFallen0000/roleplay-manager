import { useCallback, useEffect, useState } from "react"

/**
 * Fullscreen focus for the chat view: when active, the chat overlays the app
 * shell (sidebar, header, padding) and the way out is the floating button or
 * `Escape`. The mode is deliberately not persisted: it is entered and left on
 * purpose.
 */
export function useFullscreenFocus() {
  const [fullscreen, setFullscreen] = useState(false)
  const enter = useCallback(() => setFullscreen(true), [])
  const exit = useCallback(() => setFullscreen(false), [])

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [fullscreen])

  return { fullscreen, enter, exit }
}
