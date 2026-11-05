import type { PromptContextDTO, PromptContextMetadataDTO } from "@workspace/shared/types/context"
import { estimateContextTokens } from "@workspace/shared/lib/token-estimate"
import type { Locale } from "@workspace/shared/i18n"

import { Message } from "../../../domain/entities/message.entity"
import type { ConversationContextLoader } from "../../services/conversation-context-loader.service"
import type { ContextCompiler } from "../../services/context-compiler.service"
import type { ContextCompactionService } from "../../services/context-compaction.service"

const DEFAULT_OUTPUT_RESERVE = 2_048

export class GetPromptContextUseCase {
  constructor(
    private readonly contextLoader: ConversationContextLoader,
    private readonly contextCompiler: ContextCompiler,
    private readonly contextCompaction: ContextCompactionService,
  ) {}

  async execute(
    conversationId: string,
    pendingMessage?: string,
    locale?: Locale,
  ): Promise<PromptContextDTO> {
    const loaded = await this.contextLoader.load({ conversationId })
    const { conversation, characterVersion, latestSummary } = loaded

    const draft = pendingMessage?.trim()
    const pending = draft
      ? Message.create({
          id: `pending-${conversationId}`,
          conversationId,
          role: "user",
          content: draft,
          position: (loaded.messages.at(-1)?.position ?? -1) + 1,
          alternatives: [],
          alternativesCursor: 0,
          createdAt: new Date(),
          editedAt: null,
        })
      : null

    const messages = pending ? [...loaded.messages, pending] : loaded.messages
    const pendingCount = pending ? 1 : 0

    const needsCompaction = await this.contextCompaction.needsCompaction({
      conversation,
      characterVersion,
      messages,
      memories: loaded.promptMemories,
      playerCharacter: loaded.playerCharacter,
      latestSummary,
      locale,
    })

    const { context, manifest } = await this.contextCompiler.compile({
      conversation,
      characterVersion,
      messages,
      pendingCount,
      excludedCount: loaded.excludedMessageId ? 1 : 0,
      memories: loaded.memories,
      promptMemories: loaded.promptMemories,
      summary: latestSummary,
      playerCharacter: loaded.playerCharacter,
      locale,
      outputReserve: conversation.maxTokens ?? DEFAULT_OUTPUT_RESERVE,
      compaction: { needed: needsCompaction, applied: false },
    })

    const totalCharacters =
      context.systemPrompt.length +
      context.messages.reduce((acc, message) => acc + message.content.length, 0)
    const tokenEstimate = estimateContextTokens({
      systemPrompt: context.systemPrompt,
      messages: context.messages,
      outputReserve: conversation.maxTokens ?? DEFAULT_OUTPUT_RESERVE,
      contextWindow: conversation.contextWindow,
    })

    const metadata: PromptContextMetadataDTO = {
      characterName: characterVersion.name,
      characterVersion: characterVersion.versionNumber,
      summaryId: latestSummary?.id ?? null,
      memoryCount: loaded.promptMemories.length,
      recentMessageCount: context.messages.length,
      totalContextMessages: context.messages.length,
      totalCharacters,
      ...tokenEstimate,
      compactionThreshold: conversation.compactionThreshold,
    }

    return {
      systemPrompt: context.systemPrompt,
      messages: context.messages,
      metadata,
      manifest,
    }
  }
}
