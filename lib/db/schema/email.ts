// lib/db/schema/email.ts
//
// One row per business day for which the scheduled daily summary email has been
// claimed. The primary key on `day` is what makes the send idempotent: if more
// than one deployment (or a cron retry) fires for the same day, only the first
// INSERT succeeds and everyone else skips the send.

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dailyEmailLog = pgTable("daily_email_log", {
  /** Business day (Asia/Dili) as YYYY-MM-DD. */
  day:       text("day").primaryKey(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
});

export type DailyEmailLog = typeof dailyEmailLog.$inferSelect;
