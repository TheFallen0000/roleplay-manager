import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { characters } from "./characters.schema"

export const characterVersions = sqliteTable(
  "character_versions",
  {
    id: text("id").primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subtitle: text("subtitle"),
    profileImageAssetId: text("profile_image_asset_id"),
    description: text("description").notNull(),
    instructions: text("instructions"),
    greeting: text("greeting").notNull(),
    versionNumber: integer("version_number").notNull(),
    personality: text("personality"),
    scenario: text("scenario"),
    mesExample: text("mes_example"),
    alternateGreetings: text("alternate_greetings"),
    creatorNotes: text("creator_notes"),
    tags: text("tags"),
    creator: text("creator"),
    cardCharacterVersion: text("card_character_version"),
    gender: text("gender"),
    pronouns: text("pronouns"),
    tagline: text("tagline"),
    systemPrompt: text("system_prompt"),
    postHistoryInstructions: text("post_history_instructions"),
    extensions: text("extensions"),
    unknownFields: text("unknown_fields"),
    unknownRootFields: text("unknown_root_fields"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    characterNumberIdx: index("character_versions_character_number_idx").on(
      table.characterId,
      table.versionNumber,
    ),
  }),
)
