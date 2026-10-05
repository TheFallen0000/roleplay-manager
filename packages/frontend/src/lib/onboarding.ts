export const ONBOARDED_COOKIE_NAME = "rm_onboarded"
export const ONBOARDED_COOKIE_MAX_AGE = 31536000

/** Whether the welcome screen was already completed. */
export function isOnboarded(cookieValue: string | undefined | null): boolean {
  return cookieValue === "1"
}

/** Marks the welcome screen as completed (client-side). */
export function setOnboardedCookie(): void {
  try {
    document.cookie = `${ONBOARDED_COOKIE_NAME}=1; path=/; max-age=${ONBOARDED_COOKIE_MAX_AGE}; samesite=lax`
  } catch {
    // cookies unavailable
  }
}
