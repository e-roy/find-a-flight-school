import { pgTable, text, real, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const seedCandidates = pgTable(
  "seed_candidates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    phone: text("phone"),
    website: text("website"),
    resolutionMethod: text("resolution_method"),
    confidence: real("confidence"),
    evidenceJson: jsonb("evidence_json"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameCityStateIdx: index("seed_candidates_name_city_state_idx").on(
      table.name,
      table.city,
      table.state
    ),
  })
);

