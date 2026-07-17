import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Generic counter table used for two purposes, distinguished by the `key` prefix:
 *  - Global monthly Google Places budget meter: key = "places:YYYY-MM"
 *  - Per-IP fixed-window rate limits:           key = "rl:<name>:<ip>:<bucket>"
 *
 * All writes are single-statement atomic upserts (Neon HTTP has no multi-statement
 * transactions), so concurrent increments are race-free.
 */
export const apiUsage = pgTable("api_usage", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
