import { parseOoc } from "@workspace/shared/lib/ooc-parser"
import { stripDecorators } from "@workspace/shared/lib/sillytavern-card"
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
      lorebook,
      locale = DEFAULT_LOCALE,
      enableMemoryProposalTool = false,
      filterOocFromHistory = false,
    } = params

    const tr = (key: string, values?: TranslationParams) =>
      translate(locale, key, values)

    const hasText = (value: string | null | undefined): value is string =>
      typeof value === "string" && value.trim() !== ""

    const characterParts: string[] = [
      tr("prompt.intro", { name: cv.name, description: cv.description }),
      "",
    ]

    if (hasText(cv.systemPrompt)) {
      characterParts.push(tr("prompt.systemPrompt"))
      characterParts.push(cv.systemPrompt)
      characterParts.push(tr("prompt.roleplayUserAgency"))
      characterParts.push(tr("prompt.roleplayLanguage"))
      characterParts.push(tr("prompt.roleplayLength"))
    } else {
      characterParts.push(
        tr("prompt.roleplay"),
        tr("prompt.roleplayFiction"),
        tr("prompt.roleplayStayInCharacter"),
        tr("prompt.roleplayUserAgency"),
        tr("prompt.roleplayMature"),
        tr("prompt.roleplayLanguage"),
        tr("prompt.roleplayLength"),
      )
    }

    characterParts.push("")
    characterParts.push(tr("prompt.personality"))
    if (hasText(cv.personality)) {
      characterParts.push(cv.personality)
    }
    characterParts.push(tr("prompt.name", { name: cv.name }))

    if (cv.subtitle) {
      characterParts.push(tr("prompt.subtitle", { subtitle: cv.subtitle }))
    }

    if (hasText(cv.scenario)) {
      characterParts.push("")
      characterParts.push(tr("prompt.scenario"))
      characterParts.push(cv.scenario)
    }

    if (cv.instructions) {
      characterParts.push("")
      characterParts.push(tr("prompt.instructions"))
      characterParts.push(cv.instructions)
    }

    const drafts: SectionDraft[] = []

    const lorebookBefore = renderLorebookEntries(lorebook?.before)
    if (lorebookBefore) {
      drafts.push({
        id: "lorebook.before",
        reason: "Activated lorebook entries before the character",
        parts: [lorebookBefore],
        itemCount: lorebook!.before.length,
      })
    }

    drafts.push({
      id: "character",
      reason: "Character definition, roleplay rules and personality",
      parts: characterParts,
    })

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

    const lorebookAfter = renderLorebookEntries(lorebook?.after)
    if (lorebookAfter) {
      drafts.push({
        id: "lorebook.after",
        reason: "Activated lorebook entries after the character",
        parts: [lorebookAfter],
        itemCount: lorebook!.after.length,
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

    const styleParts = [
      "",
      tr("prompt.style"),
      tr("prompt.styleLine", { name: cv.name }),
      "",
      tr("prompt.styleExample", { name: cv.name }),
      `"${cv.greeting}"`,
    ]
    if (hasText(cv.mesExample)) {
      styleParts.push(cv.mesExample)
    }
    styleParts.push("")

    drafts.push({
      id: "style",
      reason: "Writing style and greeting example",
      parts: styleParts,
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

    if (hasText(cv.postHistoryInstructions)) {
      drafts.push({
        id: "card-overrides.post-history",
        reason: "Character card post-history instructions",
        parts: [
          tr("prompt.postHistoryInstructions"),
          cv.postHistoryInstructions,
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

const renderLorebookEntries = (
  entries: { content: string }[] | undefined,
): string | null => {
  if (!entries || entries.length === 0) return null
  const content = entries
    .map((entry) => stripDecorators(entry.content))
    .join("\n")
  return content.trim() === "" ? null : content
}
