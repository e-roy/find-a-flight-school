import {
  pgTable,
  pgEnum,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "school", "admin"]);

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: text("user_id").primaryKey(),
    role: userRoleEnum("role").notNull().default("user"),
    prefsJson: jsonb("prefs_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    roleIdx: index("user_profiles_role_idx").on(table.role),
  })
);
