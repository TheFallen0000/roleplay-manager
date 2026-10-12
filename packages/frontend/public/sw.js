// Pass-through service worker: Chrome on Android only treats the app as a real
// installable PWA (WebAPK through the install prompt) when a worker with a
// fetch handler is registered. It caches nothing, so every request goes to the
// live server: no offline mode and no stale assets.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {
  // Intentionally empty: requests fall through to the network.
})
