import { pgTable, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const schools = pgTable(
  "schools",
  {
    id: text("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    addrStd: jsonb("addr_std"),
    geohash: text("geohash"),
    phone: text("phone"),
    domain: text("domain"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    domainUniqueIdx: uniqueIndex("schools_domain_unique_idx").on(table.domain),
  })
);

