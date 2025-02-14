import { REQUEST_LOGS_NA_DEFUALT } from "@/constants";
import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export enum UserTier {
  Hobby = "hobby",
  Enterprise = "enterprise",
}

export const usersTable = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  apiKey: text("api_key").notNull().unique(),
  tier: text("tier", { enum: [UserTier.Hobby, UserTier.Enterprise] })
    .notNull()
    .default(UserTier.Hobby),
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
  password: text("password"),
  createdAt: int("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  lastAccessedAt: int("last_accessed_at", { mode: "timestamp" }),
  expiresAt: int("expires_at", { mode: "timestamp" }),
});

export type InsertUrl = typeof urlsTable.$inferInsert;
export type SelectUrl = Omit<typeof urlsTable.$inferSelect, "expiresAt"> & {
  expiresAt: string | null;
};

export const requestLogsTable = sqliteTable("request_logs", {
  id: int("id").primaryKey({ autoIncrement: true }),
  method: text("http_method").default(REQUEST_LOGS_NA_DEFUALT).notNull(),
  url: text("url").default(REQUEST_LOGS_NA_DEFUALT).notNull(),
  userAgent: text("user_agent").default(REQUEST_LOGS_NA_DEFUALT).notNull(),
  ip: text("ip").default(REQUEST_LOGS_NA_DEFUALT).notNull(),
  timestamp: text("timestamp").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type SelectRequestLog = typeof requestLogsTable.$inferSelect
