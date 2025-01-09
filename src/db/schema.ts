import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  apiKey: text("api_key").notNull().unique(),
  createdAt: int("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export const urlsTable = sqliteTable("urls", {
  id: int("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  shortCode: text("short_code", { length: 255 }).notNull().unique(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id),
  clicks: int("clicks").notNull().default(0),
  createdAt: int("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  lastAccessedAt: int("last_accessed_at", { mode: "timestamp" }),
});

export type InsertUrl = typeof urlsTable.$inferInsert;
export type SelectUrl = typeof urlsTable.$inferSelect;
