import { parseOoc } from "@workspace/shared/lib/ooc-parser"
import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
  type TranslationParams,
} from "@workspace/shared/i18n"

import type { CharacterVersion } from "../../../../domain/entities/character-version.entity"
import type { Message } from "../../../../domain/entities/message.entity"
import type { Memory } from "../../../../domain/entities/memory.entity"
import type { Summary } from "../../../../domain/entities/summary.entity"
import type { PromptContextBuilder } from "../../../../domain/ports/prompt-context-builder"
import type { PromptContext } from "../../../../domain/value-objects/prompt-context"

export class PromptContextBuilderImpl implements PromptContextBuilder {
  async build(params: {
    characterVersion: CharacterVersion
    messages: Message[]
    recentMessageCount: number
    memories?: Memory[]
    summary?: Summary
    playerCharacter?: { name: string; description: string }
    locale?: Locale
    enableMemoryProposalTool?: boolean
    filterOocFromHistory?: boolean
  }): Promise<PromptContext> {
    const {
      characterVersion: cv,
      messages,
      recentMessageCount,
      memories,
      summary,
      playerCharacter,
      locale = DEFAULT_LOCALE,
      enableMemoryProposalTool = false,
      filterOocFromHistory = false,
    } = params

    const tr = (key: string, values?: TranslationParams) =>
      translate(locale, key, values)

    const systemParts: string[] = [
      tr("prompt.intro", { name: cv.name, description: cv.description }),
      "",

      tr("prompt.personality"),
      tr("prompt.name", { name: cv.name }),
    ]

    if (cv.subtitle) {
      systemParts.push(tr("prompt.subtitle", { subtitle: cv.subtitle }))
    }

    if (cv.instructions) {
      systemParts.push("")
      systemParts.push(tr("prompt.instructions"))
      systemParts.push(cv.instructions)
    }

    const activeCards = cv.cards
      .filter((c) => c.active)
      .sort((a, b) => a.position - b.position)

    if (activeCards.length > 0) {
      systemParts.push("")
      systemParts.push(tr("prompt.knowledge"))
      systemParts.push(tr("prompt.knowledgeHint"))
      for (const card of activeCards) {
        systemParts.push(`[${card.title}]: ${card.content}`)
      }
    }

    if (playerCharacter) {
      systemParts.push("")
      systemParts.push(tr("prompt.userCharacter"))
      systemParts.push(
        tr("prompt.userCharacterLine", {
          name: playerCharacter.name,
          description: playerCharacter.description,
        }),
      )
    }

    if (memories && memories.length > 0) {
      systemParts.push("")
      systemParts.push(tr("prompt.memory"))
      systemParts.push(tr("prompt.memoryHint"))
      for (const mem of memories) {
        systemParts.push(
          tr("prompt.memoryLine", {
            id: mem.id,
            actor: mem.actor,
            title: mem.title,
            description: mem.description,
            priority: mem.priority,
          }),
        )
      }
    }

    if (summary) {
      systemParts.push("")
      systemParts.push(tr("prompt.summary"))
      systemParts.push(summary.content)
    }

    if (!enableMemoryProposalTool) {
      systemParts.push("")
      systemParts.push(tr("prompt.proposals"))
      systemParts.push(tr("prompt.proposalsHint"))
      systemParts.push("")
      systemParts.push("```memory_proposals")
      systemParts.push("[")
      systemParts.push(
        '  { "operation": "CREATE", "actor": "...", "title": "...", "description": "...", "priority": 5 }',
      )
      systemParts.push("]")
      systemParts.push("```")
      systemParts.push("")
      systemParts.push(tr("prompt.proposalsValidOps"))
    } else {
      systemParts.push("")
      systemParts.push(tr("prompt.proposalsAlt"))
      systemParts.push(tr("prompt.proposalsAltHint"))
      systemParts.push("")
      systemParts.push("```memory_proposals")
      systemParts.push(
        '[ { "operation": "CREATE", "actor": "...", "title": "...", "description": "...", "priority": 5 } ]',
      )
      systemParts.push("```")
      systemParts.push("")
      systemParts.push(tr("prompt.proposalsAltValidOps"))
    }

    systemParts.push("")
    systemParts.push(tr("prompt.style"))
    systemParts.push(tr("prompt.styleLine", { name: cv.name }))
    systemParts.push("")
    systemParts.push(tr("prompt.styleExample", { name: cv.name }))
    systemParts.push(`"${cv.greeting}"`)

    if (filterOocFromHistory) {
      systemParts.push("")
      systemParts.push(tr("prompt.ooc"))
      systemParts.push(tr("prompt.oocHint"))
      systemParts.push(tr("prompt.oocBullet1"))
      systemParts.push(tr("prompt.oocBullet2"))
      systemParts.push(tr("prompt.oocBullet3"))
    }

    const systemPrompt = systemParts.join("\n")

    const recentMessages = messages.slice(-recentMessageCount)
    const lastUserIdx = filterOocFromHistory
      ? recentMessages.map((m) => m.role).lastIndexOf("user")
      : -1

    const contextMessages = recentMessages.map((m, idx) => {
      if (filterOocFromHistory && m.role === "user" && idx !== lastUserIdx) {
        return {
          role: "user" as const,
          content: parseOoc(m.content).cleanedContent,
        }
      }
      return {
        role: m.role as "user" | "assistant",
        content: m.content,
      }
    })

    return {
      systemPrompt,
      messages: contextMessages,
    }
  }
}
