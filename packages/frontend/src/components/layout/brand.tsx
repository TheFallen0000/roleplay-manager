import { useState } from "react"

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

export type MascotPoseName =
  | "neutral"
  | "hello"
  | "happy"
  | "thinking"
  | "sleepy"
  | "sorry"
  | "surprised"
  | "sparkle"

/**
 * Generated pose art ships separately, so each new file is listed here once it
 * exists; every missing or broken pose falls back to the neutral mascot.
 */
const POSE_SOURCES: Partial<Record<MascotPoseName, string>> = {}

const NEUTRAL_POSE_SRC = "/brand/mascot-192.png"

export function MascotPose({
  pose = "neutral",
  className,
}: {
  pose?: MascotPoseName
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = (!failed && POSE_SOURCES[pose]) || NEUTRAL_POSE_SRC

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("shrink-0 select-none", className)}
    />
  )
}
