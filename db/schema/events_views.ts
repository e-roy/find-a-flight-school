import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const eventsViews = pgTable(
  "events_views",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    userSessionId: text("user_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    schoolIdIdx: index("events_views_school_id_idx").on(table.schoolId),
    createdAtIdx: index("events_views_created_at_idx").on(table.createdAt),
  })
);

