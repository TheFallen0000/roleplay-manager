import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

import { conversations } from "./conversations.schema"

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    position: integer("position").notNull(),
    alternatives: text("alternatives", { mode: "json" })
      .$type<string[]>()
      .default(sql`'[]'`),
    alternativesCursor: integer("alternatives_cursor").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    editedAt: integer("edited_at", { mode: "timestamp" }),
  },
  (table) => ({
    conversationPositionIdx: index("messages_conversation_position_idx").on(
      table.conversationId,
      table.position,
    ),
  }),
)
