// Runs before paint: apply the saved theme and register the service worker
// without an inline script, so the app can enforce `script-src 'self'`.
;(() => {
  try {
    const theme = localStorage.getItem("theme") || "default"
    const mode = localStorage.getItem("color-mode") || "system"
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    const dark = mode === "dark" || (mode === "system" && prefersDark)
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle("dark", dark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#17131f" : "#fbfafd")
  } catch {
    /* localStorage unavailable — fall back to the default theme */
  }
})()

// The install prompt can fire before React hydrates; capture it here so the
// in-app button never misses it. The pass-through `sw.js` is what lets Chrome
// Android offer a real install (WebAPK).
;(() => {
  window.__rmInstallPrompt = null
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    window.__rmInstallPrompt = event
    window.dispatchEvent(new Event("rm:install-ready"))
  })
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* best effort: only the install promotion depends on it */
    })
  }
})()
