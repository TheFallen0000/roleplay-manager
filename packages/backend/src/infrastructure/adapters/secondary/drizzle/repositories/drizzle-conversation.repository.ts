import { desc, eq, inArray, or } from "drizzle-orm"

import { Conversation } from "../../../../../domain/entities/conversation.entity"
import type { ConversationRepository } from "../../../../../domain/ports/conversation.repository"
import type { Database } from "../../../../config/database"
import type {
  BackgroundFit,
  ConversationSettingsUpdate,
  MemoryDecayMode,
  MemoryProposalMode,
  MessageStyle,
  TitleSource,
} from "@workspace/shared/types/conversation"
import { characterVersions, conversations } from "../schema"

type ConversationRow = typeof conversations.$inferSelect

/**
 * The column is `json` mode, so values arrive parsed; legacy rows corrupted by
 * a double encoding (a JSON string of a JSON string) are healed on read.
 */
const normalizeStopSequences = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === "string") {
    try {
      return normalizeStopSequences(JSON.parse(value))
    } catch {
      return []
    }
  }
  return []
}

const toConversation = (row: ConversationRow): Conversation =>
  Conversation.create({
    id: row.id,
    versionId: row.versionId,
    title: row.title ?? null,
    titleSource: (row.titleSource as TitleSource) ?? null,
    model: row.model ?? null,
    provider: row.provider ?? null,
    providerInstanceId: row.providerInstanceId ?? null,
    recentMessageCount: row.recentMessageCount ?? 10,
    summaryFrequency: row.summaryFrequency ?? 20,
    contextWindow: row.contextWindow ?? null,
    compactionThreshold: row.compactionThreshold ?? 80,
    temperature: row.temperature ?? 0.7,
    maxTokens: row.maxTokens ?? 2048,
    topP: row.topP ?? 0.9,
    frequencyPenalty: row.frequencyPenalty ?? 0,
    presencePenalty: row.presencePenalty ?? 0,
    stopSequences: normalizeStopSequences(row.stopSequences),
    memoryProposalMode: (row.memoryProposalMode ?? "auto") as MemoryProposalMode,
    customProfileImageAssetId: row.customProfileImageAssetId ?? null,
    backgroundImageAssetId: row.backgroundImageAssetId ?? null,
    backgroundFit: (row.backgroundFit ?? "cover") as BackgroundFit,
    backgroundScrim: row.backgroundScrim ?? 0,
    messageStyle: (row.messageStyle ?? "bubble") as MessageStyle,
    characterDialogueColor: row.characterDialogueColor ?? null,
    userDialogueColor: row.userDialogueColor ?? null,
    playerCharacterId: row.playerCharacterId ?? null,
    memoryDecayMode: (row.memoryDecayMode ?? "silent") as MemoryDecayMode,
    memoryDecayThreshold: row.memoryDecayThreshold ?? 3,
    memoryDecayAgeThreshold: row.memoryDecayAgeThreshold ?? 30,
    memoryDecaySpeed: row.memoryDecaySpeed ?? 10,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  })

export class DrizzleConversationRepository implements ConversationRepository {
  constructor(private readonly db: Database) {}

  async create(conversation: Conversation): Promise<Conversation> {
    await this.db.insert(conversations).values({
      id: conversation.id,
      versionId: conversation.versionId,
      title: conversation.title,
      model: conversation.model,
      provider: conversation.provider,
      providerInstanceId: conversation.providerInstanceId,
      recentMessageCount: conversation.recentMessageCount,
      summaryFrequency: conversation.summaryFrequency,
      contextWindow: conversation.contextWindow,
      compactionThreshold: conversation.compactionThreshold,
      temperature: conversation.temperature,
      maxTokens: conversation.maxTokens,
      topP: conversation.topP,
      frequencyPenalty: conversation.frequencyPenalty,
      presencePenalty: conversation.presencePenalty,
      stopSequences: conversation.stopSequences,
      customProfileImageAssetId: conversation.customProfileImageAssetId,
      backgroundImageAssetId: conversation.backgroundImageAssetId,
      backgroundFit: conversation.backgroundFit,
      backgroundScrim: conversation.backgroundScrim,
      messageStyle: conversation.messageStyle,
      characterDialogueColor: conversation.characterDialogueColor,
      userDialogueColor: conversation.userDialogueColor,
      playerCharacterId: conversation.playerCharacterId,
      memoryDecayMode: conversation.memoryDecayMode,
      memoryDecayThreshold: conversation.memoryDecayThreshold,
      memoryDecayAgeThreshold: conversation.memoryDecayAgeThreshold,
      memoryDecaySpeed: conversation.memoryDecaySpeed,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })

    return conversation
  }

  async findById(id: string): Promise<Conversation | null> {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toConversation(rows[0])
  }

  async list(limit?: number): Promise<Conversation[]> {
    const query = this.db
      .select()
      .from(conversations)
      .orderBy(conversations.updatedAt)
    const rows = limit ? await query.limit(limit) : await query
    return rows.map(toConversation)
  }

  async listByCharacterId(
    characterId: string,
    limit?: number,
  ): Promise<Conversation[]> {
    const query = this.db
      .select({ conversation: conversations })
      .from(conversations)
      .innerJoin(
        characterVersions,
        eq(conversations.versionId, characterVersions.id),
      )
      .where(eq(characterVersions.characterId, characterId))
      .orderBy(desc(conversations.updatedAt))
    const rows = limit ? await query.limit(limit) : await query

    return rows.map(({ conversation }) => toConversation(conversation))
  }

  async listByCharacterIds(
    characterIds: string[],
    limit?: number,
  ): Promise<Conversation[]> {
    if (characterIds.length === 0) return []

    const query = this.db
      .select({ conversation: conversations })
      .from(conversations)
      .innerJoin(
        characterVersions,
        eq(conversations.versionId, characterVersions.id),
      )
      .where(inArray(characterVersions.characterId, characterIds))
      .orderBy(desc(conversations.updatedAt))
    const rows = limit ? await query.limit(limit) : await query

    return rows.map(({ conversation }) => toConversation(conversation))
  }

  async existsByAssetId(assetId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.customProfileImageAssetId, assetId),
          eq(conversations.backgroundImageAssetId, assetId),
        ),
      )
      .limit(1)

    return rows.length > 0
  }

  async update(conversation: Conversation): Promise<Conversation> {
    await this.db
      .update(conversations)
      .set({
        title: conversation.title,
        titleSource: conversation.titleSource,
        updatedAt: conversation.updatedAt,
      })
      .where(eq(conversations.id, conversation.id))

    return conversation
  }

  async clearProviderInstanceId(providerInstanceId: string): Promise<void> {
    await this.db
      .update(conversations)
      .set({ providerInstanceId: null })
      .where(eq(conversations.providerInstanceId, providerInstanceId))
  }

  async updateSettings(
    id: string,
    settings: ConversationSettingsUpdate,
  ): Promise<Conversation> {
    const now = new Date()
    const values: Record<string, unknown> = { updatedAt: now }

    if (settings.model !== undefined) values.model = settings.model
    if (settings.provider !== undefined) values.provider = settings.provider
    if (settings.providerInstanceId !== undefined)
      values.providerInstanceId = settings.providerInstanceId
    if (settings.recentMessageCount !== undefined)
      values.recentMessageCount = settings.recentMessageCount
    if (settings.summaryFrequency !== undefined)
      values.summaryFrequency = settings.summaryFrequency
    if (settings.contextWindow !== undefined)
      values.contextWindow = settings.contextWindow
    if (settings.compactionThreshold !== undefined)
      values.compactionThreshold = settings.compactionThreshold
    if (settings.temperature !== undefined)
      values.temperature = settings.temperature
    if (settings.maxTokens !== undefined) values.maxTokens = settings.maxTokens
    if (settings.topP !== undefined) values.topP = settings.topP
    if (settings.frequencyPenalty !== undefined)
      values.frequencyPenalty = settings.frequencyPenalty
    if (settings.presencePenalty !== undefined)
      values.presencePenalty = settings.presencePenalty
    if (settings.stopSequences !== undefined)
      values.stopSequences = settings.stopSequences
    if (settings.memoryProposalMode !== undefined)
      values.memoryProposalMode = settings.memoryProposalMode
    if (settings.customProfileImageAssetId !== undefined)
      values.customProfileImageAssetId = settings.customProfileImageAssetId
    if (settings.backgroundImageAssetId !== undefined)
      values.backgroundImageAssetId = settings.backgroundImageAssetId
    if (settings.backgroundFit !== undefined)
      values.backgroundFit = settings.backgroundFit
    if (settings.backgroundScrim !== undefined)
      values.backgroundScrim = settings.backgroundScrim
    if (settings.messageStyle !== undefined)
      values.messageStyle = settings.messageStyle
    if (settings.characterDialogueColor !== undefined)
      values.characterDialogueColor = settings.characterDialogueColor
    if (settings.userDialogueColor !== undefined)
      values.userDialogueColor = settings.userDialogueColor
    if (settings.playerCharacterId !== undefined)
      values.playerCharacterId = settings.playerCharacterId
    if (settings.memoryDecayMode !== undefined)
      values.memoryDecayMode = settings.memoryDecayMode
    if (settings.memoryDecayThreshold !== undefined)
      values.memoryDecayThreshold = settings.memoryDecayThreshold
    if (settings.memoryDecayAgeThreshold !== undefined)
      values.memoryDecayAgeThreshold = settings.memoryDecayAgeThreshold
    if (settings.memoryDecaySpeed !== undefined)
      values.memoryDecaySpeed = settings.memoryDecaySpeed

    await this.db
      .update(conversations)
      .set(values)
      .where(eq(conversations.id, id))

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error(`Conversation '${id}' not found after updateSettings`)
    }

    return updated
  }
}
