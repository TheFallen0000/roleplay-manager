/** Shared bounds for user-configurable inference settings. */
export const MAX_OUTPUT_TOKENS = 200_000
export const MAX_CONTEXT_WINDOW = 2_000_000

export const clampOutputTokens = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(MAX_OUTPUT_TOKENS, Math.max(1, Math.round(value)))
    : 1

export const clampContextWindow = (
  value: number | null | undefined,
): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null
  }
  return Math.min(MAX_CONTEXT_WINDOW, Math.max(1, Math.round(value)))
}
