// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import node from "@astrojs/node"

// https://astro.build/config
export default defineConfig({
  // The dynamic routes (characters/[id], conversations/[id]) render on demand,
  // so the build needs an adapter. `standalone` emits a runnable Node server
  // (dist/server/entry.mjs) that also serves the prerendered pages.
  adapter: node({ mode: "standalone" }),
  server: {
    // Allow reaching the dev server through the Tailscale hostname
    // (e.g. `https://<machine>.<tailnet>.ts.net` via `tailscale serve`).
    allowedHosts: [".ts.net"],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
})
