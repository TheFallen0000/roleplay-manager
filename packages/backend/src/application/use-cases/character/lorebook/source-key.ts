import { createHash } from "node:crypto"

import {
  canonicalizeLorebookContent,
  type LorebookCanonicalContent,
} from "@workspace/shared/lib/lorebook-versioning"

export { canonicalizeLorebookContent }
export type { LorebookCanonicalContent }

/** SHA-256 hex digest of the canonical lorebook serialization. */
export function computeLorebookSourceKey(canonical: string): string {
  return createHash("sha256").update(canonical).digest("hex")
}
