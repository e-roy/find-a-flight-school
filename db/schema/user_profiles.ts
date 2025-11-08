import {
  pgTable,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// User profiles table for application-specific preferences
// Role is now stored in auth_users table
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  prefsJson: jsonb("prefs_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
