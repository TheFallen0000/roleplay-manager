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
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    characterNumberIdx: index("character_versions_character_number_idx").on(
      table.characterId,
      table.versionNumber,
    ),
  }),
)
