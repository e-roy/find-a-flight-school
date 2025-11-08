import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const crawlQueue = pgTable(
  "crawl_queue",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    domain: text("domain").notNull(),
    status: text("status", {
      enum: ["pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusIdx: index("crawl_queue_status_idx").on(table.status),
    scheduledAtIdx: index("crawl_queue_scheduled_at_idx").on(table.scheduledAt),
  })
);
