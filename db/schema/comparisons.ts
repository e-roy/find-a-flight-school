import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const comparisons = pgTable(
  "comparisons",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    schoolIds: text("school_ids").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("comparisons_user_id_idx").on(table.userId),
  })
);

