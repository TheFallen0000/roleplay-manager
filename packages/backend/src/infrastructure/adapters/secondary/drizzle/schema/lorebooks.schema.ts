import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { characters } from "./characters.schema"

export const lorebooks = sqliteTable(
  "lorebooks",
  {
    id: text("id").primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name"),
    description: text("description"),
    scanDepth: integer("scan_depth").notNull().default(4),
    tokenBudget: integer("token_budget").notNull().default(400),
    recursiveScanning: integer("recursive_scanning").notNull().default(0),
    extensions: text("extensions"),
    unknownFields: text("unknown_fields"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    characterIdx: uniqueIndex("lorebooks_character_idx").on(table.characterId),
  }),
)
