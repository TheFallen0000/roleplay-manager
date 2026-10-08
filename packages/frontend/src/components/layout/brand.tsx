import { cn } from "@workspace/ui/lib/utils"

/**
 * Brand marks. `BrandFace` is the compact head crop used at small sizes (the
 * sidebar; the favicon shares the same art) and `BrandMascot` is the full art
 * for the welcome screen. Both are decorative: the app name is always shown
 * as text next to them.
 *
 * The images are generated from `docs/brand/logo-source.png` with
 * `pnpm brand:generate`.
 */
export function BrandFace({ className }: { className?: string }) {
  return (
    <img
      src="/brand/face-96.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  )
}

export function BrandMascot({ className }: { className?: string }) {
  return (
    <img
      src="/brand/mascot-192.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  )
}
