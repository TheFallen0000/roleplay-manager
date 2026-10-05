import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const playerCharacters = sqliteTable("player_characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
