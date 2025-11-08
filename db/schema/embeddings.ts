import {
  pgTable,
  text,
  timestamp,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { schools } from "./schools";

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: { data: number[]; driverData: string }): string {
    // Convert array to pgvector format: [1,2,3]
    return `[${value.data.join(",")}]`;
  },
  fromDriver(value: string): { data: number[]; driverData: string } {
    // Parse pgvector format back to array
    const parsed = JSON.parse(value);
    return { data: parsed, driverData: value };
  },
});

export const schoolEmbeddings = pgTable(
  "school_embeddings",
  {
    schoolId: text("school_id")
      .notNull()
      .primaryKey()
      .references(() => schools.id, { onDelete: "cascade" }),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    embeddingIdx: index("school_embeddings_embedding_idx").using(
      "ivfflat",
      sql`${table.embedding} vector_cosine_ops`
    ),
  })
);

