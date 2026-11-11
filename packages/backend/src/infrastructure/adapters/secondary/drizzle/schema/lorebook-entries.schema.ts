import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { lorebooks } from "./lorebooks.schema"

export const lorebookEntries = sqliteTable(
  "lorebook_entries",
  {
    id: text("id").primaryKey(),
    lorebookId: text("lorebook_id")
      .notNull()
      .references(() => lorebooks.id, { onDelete: "cascade" }),
    name: text("name"),
    sourceId: text("source_id"),
    keys: text("keys").notNull(),
    secondaryKeys: text("secondary_keys").notNull().default("[]"),
    comment: text("comment"),
    content: text("content").notNull(),
    constant: integer("constant").notNull().default(0),
    selective: integer("selective").notNull().default(0),
    selectiveLogic: integer("selective_logic").notNull().default(0),
    insertionOrder: integer("insertion_order").notNull().default(100),
    position: text("position", { enum: ["before_char", "after_char"] })
      .notNull()
      .default("after_char"),
    rawPosition: text("raw_position"),
    priority: integer("priority").notNull().default(0),
    enabled: integer("enabled").notNull().default(1),
    caseSensitive: integer("case_sensitive").notNull().default(0),
    wholeWords: integer("whole_words").notNull().default(0),
    order: integer("order").notNull(),
    extensions: text("extensions"),
    unknownFields: text("unknown_fields"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    lorebookOrderIdx: index("lorebook_entries_lorebook_idx").on(
      table.lorebookId,
      table.order,
    ),
  }),
)
