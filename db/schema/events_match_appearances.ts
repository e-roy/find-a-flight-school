import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const eventsMatchAppearances = pgTable(
  "events_match_appearances",
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
    schoolIdIdx: index("events_match_appearances_school_id_idx").on(table.schoolId),
    createdAtIdx: index("events_match_appearances_created_at_idx").on(table.createdAt),
  })
);

