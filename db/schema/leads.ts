import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    userId: text("user_id"),
    payloadJson: jsonb("payload_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    schoolIdIdx: index("leads_school_id_idx").on(table.schoolId),
    userIdIdx: index("leads_user_id_idx").on(table.userId),
  })
);
