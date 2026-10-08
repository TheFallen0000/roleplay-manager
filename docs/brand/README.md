# Brand assets

Source art and generated images for the app's identity (favicon, sidebar and
welcome screen).

## Source

- `logo-source.png` — the original 2400x2400 illustration (transparent
  background). It is **not served** by the app; keep it here as the master copy.

## Generated (committed)

`pnpm brand:generate` (`scripts/generate-brand-assets.mjs`, uses sharp) derives
every served image from the source:

| File | Use | Size |
|---|---|---|
| `packages/frontend/public/favicon-16x16.png` | browser tab (16px) | 0.7 KB |
| `packages/frontend/public/favicon-32x32.png` | browser tab (32px) | 1.9 KB |
| `packages/frontend/public/favicon-48x48.png` | browser tab / bookmarks | 2.8 KB |
| `packages/frontend/public/apple-touch-icon.png` | iOS home screen (180px) | 15.7 KB |
| `packages/frontend/public/brand/face-96.png` | sidebar mark (24px) | 6.4 KB |
| `packages/frontend/public/brand/mascot-192.png` | welcome screen (40px) | 10.0 KB |

- Small sizes (favicons, sidebar) use a **square crop of the head** (`FACE` in
  the script), which stays readable at 16-32px; the welcome screen uses the
  **full mascot**.
- The palette PNG encoder keeps the whole set under ~40 KB while staying
  faithful to the original art.

To regenerate after replacing the source art, run `pnpm brand:generate` and
commit the results. If the crop no longer frames the face, adjust `FACE` in the
script.

The repo briefly carried an auto-traced SVG of the mascot (VTracer); it was
dropped in favour of these optimized PNGs (the trace weighed 706 KB and had
visible artifacts).
