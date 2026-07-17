import {
  pgTable,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  real,
  index,
} from "drizzle-orm/pg-core";

export const schools = pgTable(
  "schools",
  {
    id: text("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    addrStd: jsonb("addr_std"),
    geohash: text("geohash"),
    phone: text("phone"),
    domain: text("domain"),
    lat: real("lat"),
    lng: real("lng"),
    googlePlaceId: text("google_place_id"),
    // null = admin/seed import; "public" = added via the public add-a-school flow.
    addedVia: text("added_via"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    domainUniqueIdx: uniqueIndex("schools_domain_unique_idx").on(table.domain),
    googlePlaceIdIdx: index("schools_google_place_id_idx").on(table.googlePlaceId),
  })
);

