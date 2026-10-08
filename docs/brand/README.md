# Brand assets

Source art and generated images for the app's identity (favicon, sidebar,
welcome screen and install icons).

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
| `packages/frontend/public/apple-touch-icon.png` | iOS home screen (180px, opaque) | 13.2 KB |
| `packages/frontend/public/brand/face-96.png` | sidebar mark (24px) | 6.4 KB |
| `packages/frontend/public/brand/mascot-192.png` | welcome screen (40px) | 10.0 KB |
| `packages/frontend/public/brand/icon-192.png` | install icon (opaque) | 14.5 KB |
| `packages/frontend/public/brand/icon-512.png` | install icon (opaque) | 55.6 KB |
| `packages/frontend/public/brand/icon-maskable-512.png` | install icon (maskable) | 35.3 KB |

- Small sizes (favicons, sidebar) use a **square crop of the head** (`FACE` in
  the script), which stays readable at 16-32px; the welcome screen uses the
  **full mascot**.
- Favicons stay **transparent** (they look better in the browser tab). The
  install icons (`apple-touch-icon` and the PWA set) are **opaque** on a cream
  plate (`ICON_BG`) because Android and iOS fill transparency with a colour we
  do not control.
- The **maskable** icon scales the art to 70% so it stays inside Android's safe
  zone (~80% circle) whatever shape the launcher uses.
- The palette PNG encoder keeps each file small while staying faithful to the
  original art.

The manifest that references the install icons lives at
`packages/frontend/public/manifest.webmanifest`.

To regenerate after replacing the source art, run `pnpm brand:generate` and
commit the results. If the crop no longer frames the face, adjust `FACE` in the
script.

The repo briefly carried an auto-traced SVG of the mascot (VTracer); it was
dropped in favour of these optimized PNGs (the trace weighed 706 KB and had
visible artifacts).
