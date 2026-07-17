import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { schools } from "./schools";

/**
 * Tracks schools whose Google Places photo failed to load (the stored photo
 * resource name expired). Rows are written by the photo proxy on a non-2xx from
 * Google and cleared by the photo-refresh cron after a successful re-fetch, so
 * the table effectively holds the set of schools with a known-broken image.
 */
export const photoHealth = pgTable("photo_health", {
  schoolId: text("school_id")
    .primaryKey()
    .references(() => schools.id),
  status: text("status").$type<"ok" | "broken">().notNull(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
