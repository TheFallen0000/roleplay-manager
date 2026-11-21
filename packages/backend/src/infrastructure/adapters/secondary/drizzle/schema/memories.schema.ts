import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"

import { conversations } from "./conversations.schema"

export const memories = sqliteTable(
  "memories",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: integer("priority").notNull().default(5),
    type: text("type", { enum: ["fact", "episode", "thread"] })
      .notNull()
      .default("fact"),
    createdBy: text("created_by", { enum: ["user", "assistant"] }).notNull(),
    updatedBy: text("updated_by", {
      enum: ["user", "assistant", "system"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    titleUnique: unique("memories_conversation_actor_title_unique").on(
      table.conversationId,
      table.actor,
      table.title,
    ),
    conversationPriorityIdx: index("memories_conversation_priority_idx").on(
      table.conversationId,
      table.priority,
    ),
  }),
)
