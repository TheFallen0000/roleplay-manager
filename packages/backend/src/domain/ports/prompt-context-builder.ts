import type { CharacterVersion } from "../entities/character-version.entity"
import type { Message } from "../entities/message.entity"
import type { Memory } from "../entities/memory.entity"
import type { PromptContext } from "../value-objects/prompt-context"
import type { Locale } from "@workspace/shared/i18n"

import type { Summary } from "../entities/summary.entity"

export interface PromptContextPlayerCharacter {
  name: string
  description: string
}

export interface PromptContextBuilder {
  build(params: {
    characterVersion: CharacterVersion
    messages: Message[]
    recentMessageCount: number
    memories?: Memory[]
    summary?: Summary
    playerCharacter?: PromptContextPlayerCharacter
    /** Language of the system prompt (follows the UI language). */
    locale?: Locale
    enableMemoryProposalTool?: boolean
    filterOocFromHistory?: boolean
  }): Promise<PromptContext>
}
