// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import node from "@astrojs/node"

// Astro loads this config for every command. The dev server and the build run
// different dependency optimizers; sharing one cache directory means a build
// run while `pnpm dev` is up can clobber the dev server's optimized deps and
// break client hydration (504 "Outdated Optimize Dep"). Keep them separate.
const isBuild = process.argv.includes("build")

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
    cacheDir: isBuild ? "node_modules/.vite-build" : "node_modules/.vite-dev",
  },
  integrations: [react()],
})
