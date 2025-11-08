import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const sourceTypeEnum = pgEnum("source_type", [
  "FAA",
  "PLACES",
  "CRAWL",
  "CLAIM",
  "MANUAL",
]);

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id),
  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceRef: text("source_ref"),
  observedDomain: text("observed_domain"),
  observedName: text("observed_name"),
  observedPhone: text("observed_phone"),
  observedAddr: jsonb("observed_addr"),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
});
