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
  // `middleware` mode emits a handler that the backend mounts inside Express,
  // so production runs as a single process (UI + API). Development still uses
  // `astro dev` and is unaffected. Note: `astro preview` is not supported in
  // this mode.
  adapter: node({ mode: "middleware" }),
  server: {
    // Allow reaching the dev server through the Tailscale hostname
    // (e.g. `https://<machine>.<tailnet>.ts.net` via `tailscale serve`).
    allowedHosts: [".ts.net"],
  },
  security: {
    // Astro hashes its processed scripts/styles into a meta CSP. The bootstrap
    // script is external (`/rm-bootstrap.js`) so script-src can stay on 'self';
    // React and libraries still need inline style attributes.
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "media-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: {
        // react-easy-crop and sonner inject their own <style> elements at
        // runtime; React also uses style attributes. Keep script-src strict
        // and allow inline styles, which cannot execute JavaScript.
        resources: [
          { resource: "'self'", kind: "element" },
          { resource: "'unsafe-inline'", kind: "element" },
          { resource: "'unsafe-inline'", kind: "attribute" },
        ],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    cacheDir: isBuild ? "node_modules/.vite-build" : "node_modules/.vite-dev",
  },
  integrations: [react()],
})
