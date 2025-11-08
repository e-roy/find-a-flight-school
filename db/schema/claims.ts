import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const claims = pgTable(
  "claims",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    email: text("email").notNull(),
    token: text("token").notNull(),
    status: text("status").notNull().$type<"PENDING" | "VERIFIED">(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenUniqueIdx: uniqueIndex("claims_token_unique_idx").on(table.token),
    schoolIdIdx: index("claims_school_id_idx").on(table.schoolId),
  })
);
