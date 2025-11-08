import { pgTable, text, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const snapshots = pgTable(
  "snapshots",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    domain: text("domain"),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    rawJson: jsonb("raw_json"),
    extractConfidence: real("extract_confidence"),
  },
  (table) => ({
    schoolIdAsOfIdx: index("snapshots_school_id_as_of_idx").on(
      table.schoolId,
      table.asOf
    ),
  })
);

