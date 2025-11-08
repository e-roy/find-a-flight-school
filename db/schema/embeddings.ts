import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { schools } from "./schools";

// Note: Using text type temporarily for drizzle-kit compatibility
// After enabling pgvector extension, manually run:
// ALTER TABLE school_embeddings ALTER COLUMN embedding TYPE vector(1536) USING embedding::text::vector;

export const schoolEmbeddings = pgTable(
  "school_embeddings",
  {
    schoolId: text("school_id")
      .notNull()
      .primaryKey()
      .references(() => schools.id, { onDelete: "cascade" }),
    embedding: text("embedding").notNull(), // Will be migrated to vector(1536) after pgvector extension is enabled
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
  // Index will be created after pgvector migration (see db/migrations/enable_pgvector.sql)
  // Note: ivfflat index requires vector type, not text
);
