import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { conversations } from "./conversations.schema"
import { messages } from "./messages.schema"

export const summaries = sqliteTable(
  "summaries",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    firstMessageId: text("first_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    lastMessageId: text("last_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    model: text("model"),
    provider: text("provider"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    editedAt: integer("edited_at", { mode: "timestamp" }),
  },
  (table) => ({
    conversationCreatedIdx: index("summaries_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  }),
)
