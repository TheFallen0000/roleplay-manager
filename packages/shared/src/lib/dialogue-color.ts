export const DIALOGUE_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

/** A stored dialogue colour is a `#RRGGBB` string; null means the theme default. */
export function isValidDialogueColor(value: unknown): value is string {
  return typeof value === "string" && DIALOGUE_COLOR_PATTERN.test(value)
}

/** Keeps a valid hex colour and clears anything else (legacy or hand-made files). */
export function normalizeDialogueColor(value: unknown): string | null {
  return isValidDialogueColor(value) ? value : null
}
