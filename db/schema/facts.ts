import {
  pgTable,
  text,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const facts = pgTable(
  "facts",
  {
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    factKey: text("fact_key").notNull(),
    factValue: jsonb("fact_value").notNull(),
    provenance: text("provenance").notNull(),
    moderationStatus: text("moderation_status")
      .notNull()
      .$type<"APPROVED" | "PENDING" | "REJECTED">()
      .default("APPROVED"),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.schoolId, table.factKey, table.asOf] }),
    schoolIdFactKeyIdx: index("facts_school_id_fact_key_idx").on(
      table.schoolId,
      table.factKey
    ),
  })
);
