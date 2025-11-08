import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const savedSchools = pgTable(
  "saved_schools",
  {
    userId: text("user_id").notNull(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.schoolId] }),
    userIdIdx: index("saved_schools_user_id_idx").on(table.userId),
    schoolIdIdx: index("saved_schools_school_id_idx").on(table.schoolId),
  })
);

