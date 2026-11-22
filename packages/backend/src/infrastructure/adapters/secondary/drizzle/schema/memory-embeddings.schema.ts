import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { memories } from "./memories.schema"

export const memoryEmbeddings = sqliteTable("memory_embeddings", {
  memoryId: text("memory_id")
    .primaryKey()
    .references(() => memories.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  dimension: integer("dimension").notNull(),
  vector: blob("vector", { mode: "buffer" }).notNull(),
  textHash: text("text_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
