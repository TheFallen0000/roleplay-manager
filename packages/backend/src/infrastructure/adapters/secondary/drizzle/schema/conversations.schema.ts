import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

import { characterVersions } from "./character-versions.schema"
import { providerInstances } from "./provider-instances.schema"
import { playerCharacters } from "./player-characters.schema"

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  versionId: text("version_id")
    .notNull()
    .references(() => characterVersions.id, { onDelete: "cascade" }),
  title: text("title"),
  titleSource: text("title_source", { enum: ["auto", "manual"] }),
  model: text("model"),
  provider: text("provider"),
  providerInstanceId: text("provider_instance_id").references(
    () => providerInstances.id,
    { onDelete: "set null" },
  ),
  recentMessageCount: integer("recent_message_count").default(10),
  summaryFrequency: integer("summary_frequency").default(20),
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(2048),
  topP: real("top_p").default(0.9),
  frequencyPenalty: real("frequency_penalty").default(0),
  presencePenalty: real("presence_penalty").default(0),
  stopSequences: text("stop_sequences", { mode: "json" })
    .$type<string[]>()
    .default(sql`'[]'`),
  memoryProposalMode: text("memory_proposal_mode", {
    enum: ["auto", "manual"],
  })
    .notNull()
    .default("auto"),
  customProfileImageAssetId: text("custom_profile_image_asset_id"),
  playerCharacterId: text("player_character_id").references(
    () => playerCharacters.id,
    { onDelete: "set null" },
  ),
  memoryDecayMode: text("memory_decay_mode", {
    enum: ["silent", "manual", "off"],
  })
    .notNull()
    .default("silent"),
  memoryDecayThreshold: integer("memory_decay_threshold").notNull().default(3),
  memoryDecayAgeThreshold: integer("memory_decay_age_threshold").notNull().default(30),
  memoryDecaySpeed: integer("memory_decay_speed").notNull().default(10),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
