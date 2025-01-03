import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const urlsTable = sqliteTable("urls", {
  id: int("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  shortCode: text("short_code", { length: 255 }).notNull().unique(),
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type InsertUrl = typeof urlsTable.$inferInsert;
export type SelectUrl = typeof urlsTable.$inferSelect;
