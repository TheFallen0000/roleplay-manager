import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { conversations } from "./conversations.schema"
import { memories } from "./memories.schema"

export const memoryChangeProposals = sqliteTable(
  "memory_change_proposals",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    operation: text("operation", { enum: ["CREATE", "UPDATE", "DELETE"] }).notNull(),
    targetMemoryId: text("target_memory_id").references(() => memories.id, {
      onDelete: "set null",
    }),
    actor: text("actor").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: integer("priority").notNull().default(5),
    status: text("status", { enum: ["pending", "applied", "discarded"] })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    processedAt: integer("processed_at", { mode: "timestamp" }),
    processedBy: text("processed_by", { enum: ["user", "system"] })
      .notNull()
      .default("user"),
  },
  (table) => ({
    conversationStatusIdx: index(
      "memory_proposals_conversation_status_idx",
    ).on(table.conversationId, table.status),
  }),
)
