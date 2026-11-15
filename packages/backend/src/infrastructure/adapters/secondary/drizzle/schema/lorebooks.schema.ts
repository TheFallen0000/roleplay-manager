import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { lorebookVersions } from "./lorebook-versions.schema"

export const lorebooks = sqliteTable(
  "lorebooks",
  {
    id: text("id").primaryKey(),
    // Legacy S132 link: nullable and without a foreign key so a book can be
    // standalone and deleting a character never removes it. The S133 backfill
    // clears it after linking every character version.
    characterId: text("character_id"),
    name: text("name"),
    description: text("description"),
    scanDepth: integer("scan_depth").notNull().default(4),
    tokenBudget: integer("token_budget").notNull().default(400),
    recursiveScanning: integer("recursive_scanning").notNull().default(0),
    extensions: text("extensions"),
    unknownFields: text("unknown_fields"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    originId: text("origin_id"),
    currentVersionId: text("current_version_id").references(
      (): AnySQLiteColumn => lorebookVersions.id,
      { onDelete: "set null" },
    ),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => ({
    originIdx: index("lorebooks_origin_idx").on(table.originId),
  }),
)
