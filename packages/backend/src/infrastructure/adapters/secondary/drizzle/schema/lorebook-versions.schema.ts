import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { lorebooks } from "./lorebooks.schema"

export const lorebookVersions = sqliteTable(
  "lorebook_versions",
  {
    id: text("id").primaryKey(),
    lorebookId: text("lorebook_id")
      .notNull()
      .references((): AnySQLiteColumn => lorebooks.id, {
        onDelete: "restrict",
      }),
    versionNumber: integer("version_number").notNull(),
    name: text("name"),
    description: text("description"),
    scanDepth: integer("scan_depth").notNull().default(4),
    tokenBudget: integer("token_budget").notNull().default(400),
    recursiveScanning: integer("recursive_scanning").notNull().default(0),
    entriesJson: text("entries_json").notNull(),
    sourceKey: text("source_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    bookVersionUnique: uniqueIndex("lorebook_versions_book_version_idx").on(
      table.lorebookId,
      table.versionNumber,
    ),
    sourceKeyIdx: index("lorebook_versions_source_key_idx").on(table.sourceKey),
  }),
)
