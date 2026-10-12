/** Identifier of a tutorial; also the value of the `?t=` URL parameter. */
export type TutorialId =
  | "phone-access"
  | "pwa-install"
  | "lan-access"
  | "providers"
  | "characters"
  | "branches"
  | "memory-summaries"
  | "chat-customization"
  | "data-updates"

export type TutorialCategoryId = "mobile" | "ai" | "play" | "custom"

export interface TutorialStep {
  title: string
  body: string
}

export interface TutorialAction {
  label: string
  href: string
}

export interface Tutorial {
  title: string
  description: string
  steps: TutorialStep[]
  tips: string[]
  action?: TutorialAction
}

/**
 * Long-form content per locale. Both files are typed against this record, so
 * TypeScript fails when a tutorial is missing a translation.
 */
export type TutorialContent = Record<TutorialId, Tutorial>
