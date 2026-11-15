import type { CharacterVersion } from "../entities/character-version.entity"
import type { Message } from "../entities/message.entity"
import type { Memory } from "../entities/memory.entity"
import type { PromptContext, PromptContextSection } from "../value-objects/prompt-context"
import type { Locale } from "@workspace/shared/i18n"

import type { Summary } from "../entities/summary.entity"

export interface PromptContextPlayerCharacter {
  name: string
  description: string
}

export interface PromptContextLorebookEntry {
  id?: string
  content: string
}

export interface PromptContextLorebook {
  before: PromptContextLorebookEntry[]
  after: PromptContextLorebookEntry[]
  overBudgetCount?: number
  /** Version metadata for debugging the manifest (S133). */
  versionNumber?: number
  sourceKey?: string
}

export interface PromptContextBuildParams {
  characterVersion: CharacterVersion
  messages: Message[]
  recentMessageCount: number
  memories?: Memory[]
  summary?: Summary
  playerCharacter?: PromptContextPlayerCharacter
  /** Activated lorebook entries, already split by their injection position. */
  lorebook?: PromptContextLorebook
  /** Language of the system prompt (follows the UI language). */
  locale?: Locale
  enableMemoryProposalTool?: boolean
  filterOocFromHistory?: boolean
}

export interface PromptContextBuilder {
  build(params: PromptContextBuildParams): Promise<PromptContext>

  buildWithSections(params: PromptContextBuildParams): Promise<{
    context: PromptContext
    sections: PromptContextSection[]
  }>
}
