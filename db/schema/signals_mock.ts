import { pgTable, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const signalsMock = pgTable(
  "signals_mock",
  {
    schoolId: text("school_id")
      .notNull()
      .primaryKey()
      .references(() => schools.id),
    trainingVelocity: real("training_velocity"),
    scheduleReliability: real("schedule_reliability"),
    safetyNotes: text("safety_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    schoolIdIdx: index("signals_mock_school_id_idx").on(table.schoolId),
  })
);
