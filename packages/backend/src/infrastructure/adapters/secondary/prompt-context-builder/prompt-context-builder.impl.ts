import { parseOoc } from "@workspace/shared/lib/ooc-parser"
import {
  DEFAULT_LOCALE,
  translate,
  type TranslationParams,
} from "@workspace/shared/i18n"

import type { PromptContextBuilder, PromptContextBuildParams } from "../../../../domain/ports/prompt-context-builder"
import type {
  PromptContext,
  PromptContextMessage,
  PromptContextSection,
} from "../../../../domain/value-objects/prompt-context"

interface SectionDraft {
  id: string
  reason: string
  parts: string[]
  itemCount?: number
}

export class PromptContextBuilderImpl implements PromptContextBuilder {
  async build(params: PromptContextBuildParams): Promise<PromptContext> {
    const { context } = await this.buildWithSections(params)
    return context
  }

  async buildWithSections(params: PromptContextBuildParams): Promise<{
    context: PromptContext
    sections: PromptContextSection[]
  }> {
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

    const characterParts: string[] = [
      tr("prompt.intro", { name: cv.name, description: cv.description }),
      "",
      tr("prompt.roleplay"),
      tr("prompt.roleplayFiction"),
      tr("prompt.roleplayStayInCharacter"),
      tr("prompt.roleplayUserAgency"),
      tr("prompt.roleplayMature"),
      tr("prompt.roleplayLanguage"),
      tr("prompt.roleplayLength"),
      "",
      tr("prompt.personality"),
      tr("prompt.name", { name: cv.name }),
    ]

    if (cv.subtitle) {
      characterParts.push(tr("prompt.subtitle", { subtitle: cv.subtitle }))
    }

    if (cv.instructions) {
      characterParts.push("")
      characterParts.push(tr("prompt.instructions"))
      characterParts.push(cv.instructions)
    }

    const drafts: SectionDraft[] = [
      {
        id: "character",
        reason: "Character definition, roleplay rules and personality",
        parts: characterParts,
      },
    ]

    const activeCards = cv.cards
      .filter((c) => c.active)
      .sort((a, b) => a.position - b.position)

    if (activeCards.length > 0) {
      const cardParts = [
        "",
        tr("prompt.knowledge"),
        tr("prompt.knowledgeHint"),
      ]
      for (const card of activeCards) {
        cardParts.push(`[${card.title}]: ${card.content}`)
      }
      drafts.push({
        id: "cards",
        reason: "Active character cards",
        parts: cardParts,
        itemCount: activeCards.length,
      })
    }

    if (playerCharacter) {
      drafts.push({
        id: "player",
        reason: "Player character description",
        parts: [
          "",
          tr("prompt.userCharacter"),
          tr("prompt.userCharacterLine", {
            name: playerCharacter.name,
            description: playerCharacter.description,
          }),
        ],
      })
    }

    if (memories && memories.length > 0) {
      const memoryParts = ["", tr("prompt.memory"), tr("prompt.memoryHint")]
      for (const mem of memories) {
        memoryParts.push(
          tr("prompt.memoryLine", {
            id: mem.id,
            actor: mem.actor,
            title: mem.title,
            description: mem.description,
            priority: mem.priority,
          }),
        )
      }
      drafts.push({
        id: "memories",
        reason: "Prompt-eligible memories",
        parts: memoryParts,
        itemCount: memories.length,
      })
    }

    if (summary) {
      drafts.push({
        id: "summary",
        reason: "Latest conversation summary",
        parts: ["", tr("prompt.summary"), summary.content],
      })
    }

    const proposalParts = [
      "",
      tr("prompt.proposals"),
      tr("prompt.proposalsIntro"),
      tr("prompt.proposalsWhat"),
      tr("prompt.proposalsWhen"),
      tr("prompt.proposalsOps"),
      tr("prompt.proposalsDedup"),
      tr("prompt.proposalsIds"),
      tr("prompt.proposalsUpdate"),
      tr("prompt.proposalsDelete"),
      tr("prompt.proposalsActor"),
      tr("prompt.proposalsShape"),
      tr("prompt.proposalsPriority"),
      tr("prompt.proposalsLanguage"),
      "",
    ]
    if (enableMemoryProposalTool) {
      proposalParts.push(tr("prompt.proposalsTool"))
      proposalParts.push(tr("prompt.proposalsFallback"))
    } else {
      proposalParts.push(tr("prompt.proposalsBlockOnly"))
    }
    proposalParts.push("")
    proposalParts.push("```memory_proposals")
    proposalParts.push("[")
    proposalParts.push(
      '  { "operation": "CREATE", "actor": "...", "title": "...", "description": "...", "priority": 5 }',
    )
    proposalParts.push("]")
    proposalParts.push("```")
    proposalParts.push("")
    proposalParts.push(tr("prompt.proposalsExampleHint"))
    if (enableMemoryProposalTool) {
      proposalParts.push(tr("prompt.proposalsNoBoth"))
    }
    drafts.push({
      id: "proposals",
      reason: "Memory proposal format instructions",
      parts: proposalParts,
    })

    drafts.push({
      id: "style",
      reason: "Writing style and greeting example",
      parts: [
        "",
        tr("prompt.style"),
        tr("prompt.styleLine", { name: cv.name }),
        "",
        tr("prompt.styleExample", { name: cv.name }),
        `"${cv.greeting}"`,
        "",
      ],
    })

    drafts.push({
      id: "format",
      reason: "Response formatting rules",
      parts: [
        tr("prompt.format"),
        tr("prompt.formatActions"),
        tr("prompt.formatNoMarkdown"),
        tr("prompt.formatNoEmoji"),
        tr("prompt.formatEdges"),
        tr("prompt.formatInCharacter"),
      ],
    })

    if (filterOocFromHistory) {
      drafts.push({
        id: "ooc",
        reason: "Out-of-character filtering instructions",
        parts: [
          "",
          tr("prompt.ooc"),
          tr("prompt.oocHint"),
          tr("prompt.oocBullet1"),
          tr("prompt.oocBullet2"),
          tr("prompt.oocBullet3"),
        ],
      })
    }

    const sections: PromptContextSection[] = drafts.map((draft) => ({
      id: draft.id,
      source: "system",
      content: draft.parts.join("\n"),
      reason: draft.reason,
      ...(draft.itemCount !== undefined ? { itemCount: draft.itemCount } : {}),
    }))

    const recentMessages = messages.slice(-recentMessageCount)
    const lastUserIdx = filterOocFromHistory
      ? recentMessages.map((m) => m.role).lastIndexOf("user")
      : -1

    const contextMessages: PromptContextMessage[] = recentMessages.map(
      (m, idx) => {
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
      },
    )

    return {
      context: {
        systemPrompt: sections.map((section) => section.content).join("\n"),
        messages: contextMessages,
      },
      sections,
    }
  }
}
