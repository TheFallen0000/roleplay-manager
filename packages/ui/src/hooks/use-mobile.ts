import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

function getMobileMediaQuery() {
  if (typeof window === "undefined") return { matches: false }
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

function subscribe(callback: () => void) {
  const mql = getMobileMediaQuery()
  if ("addEventListener" in mql) {
    mql.addEventListener("change", callback)
    return () => mql.removeEventListener("change", callback)
  }
  return () => {}
}

function getSnapshot() {
  return getMobileMediaQuery().matches
}

function getServerSnapshot() {
  return false
}

export function useMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
