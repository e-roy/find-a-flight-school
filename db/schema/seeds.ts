import {
  pgTable,
  text,
  real,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const seedCandidates = pgTable(
  "seed_candidates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    streetAddress: text("street_address"),
    postalCode: text("postal_code"),
    phone: text("phone"),
    website: text("website"),
    resolutionMethod: text("resolution_method"),
    confidence: real("confidence"),
    rating: real("rating"),
    userRatingCount: integer("user_rating_count"),
    businessStatus: text("business_status"),
    priceLevel: text("price_level"),
    photos: jsonb("photos"),
    regularOpeningHours: jsonb("regular_opening_hours"),
    currentOpeningHours: jsonb("current_opening_hours"),
    evidenceJson: jsonb("evidence_json"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameCityStateIdx: index("seed_candidates_name_city_state_idx").on(
      table.name,
      table.city,
      table.state
    ),
  })
);
