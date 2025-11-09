import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { savedSchools, comparisons } from "@/db/schema";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { MatchRequestSchema } from "@/lib/validation";
import { eq, and, desc } from "drizzle-orm";
import { FACT_KEYS } from "@/types";

// Search input schema extends MatchRequestSchema with pagination
const SearchInputSchema = MatchRequestSchema.extend({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Helper to get latest facts for a school
async function getLatestFactsForSchool(
  db: typeof import("@/lib/db").db,
  schoolId: string
): Promise<Map<string, typeof facts.$inferSelect>> {
  const allFacts = await db.query.facts.findMany({
    where: eq(facts.schoolId, schoolId),
    orderBy: [desc(facts.asOf)],
  });

  // Group by fact_key and keep only the latest (first) fact per key
  const latestFactsByKey = new Map<string, typeof facts.$inferSelect>();
  for (const fact of allFacts) {
    if (!latestFactsByKey.has(fact.factKey)) {
      latestFactsByKey.set(fact.factKey, fact);
    }
  }

  return latestFactsByKey;
}

export const marketplaceRouter = router({
  search: router({
    query: publicProcedure
      .input(SearchInputSchema.optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        // Stub implementation: return paginated schools
        // TODO: Implement actual filtering based on input filters
        try {
          const allSchools = await ctx.db.query.schools.findMany({
            orderBy: (schools, { desc }) => [desc(schools.createdAt)],
          });
          // Manual pagination
          const paginatedSchools = allSchools.slice(offset, offset + limit);

          // Fetch latest facts for each school
          const schoolsWithFacts = await Promise.all(
            paginatedSchools.map(async (school) => {
              const latestFacts = await getLatestFactsForSchool(
                ctx.db,
                school.id
              );

              // Extract key facts for card display
              const programs = Array.from(latestFacts.values())
                .filter((f) => f.factKey === FACT_KEYS.PROGRAM_TYPE)
                .map((f) => f.factValue)
                .filter(
                  (v): v is string =>
                    typeof v === "string" && v.length > 0
                );

              const costBand = latestFacts.get(FACT_KEYS.COST_BAND)?.factValue;
              const fleetAircraft = latestFacts.get(FACT_KEYS.FLEET_AIRCRAFT)
                ?.factValue;
              const rating = latestFacts.get(FACT_KEYS.RATING)?.factValue;
              const ratingCount = latestFacts.get(FACT_KEYS.RATING_COUNT)
                ?.factValue;
              const photos = latestFacts.get(FACT_KEYS.PHOTOS)?.factValue;

              return {
                ...school,
                facts: {
                  programs,
                  costBand:
                    typeof costBand === "string" ? costBand : undefined,
                  fleetAircraft: Array.isArray(fleetAircraft)
                    ? fleetAircraft
                    : undefined,
                  rating:
                    typeof rating === "number" ? rating : undefined,
                  ratingCount:
                    typeof ratingCount === "number" ? ratingCount : undefined,
                  photos: Array.isArray(photos) ? photos : undefined,
                },
              };
            })
          );

          return schoolsWithFacts;
        } catch (error) {
          // Fallback to standard query builder if relational API fails
          console.error(
            "Relational query failed, using standard builder:",
            error
          );
          const { db } = await import("@/lib/db");
          const allSchools = await db
            .select()
            .from(schools)
            .orderBy(desc(schools.createdAt));
          const paginatedSchools = allSchools.slice(offset, offset + limit);

          // Fetch latest facts for each school
          const schoolsWithFacts = await Promise.all(
            paginatedSchools.map(async (school) => {
              const latestFacts = await getLatestFactsForSchool(db, school.id);

              // Extract key facts for card display
              const programs = Array.from(latestFacts.values())
                .filter((f) => f.factKey === FACT_KEYS.PROGRAM_TYPE)
                .map((f) => f.factValue)
                .filter(
                  (v): v is string =>
                    typeof v === "string" && v.length > 0
                );

              const costBand = latestFacts.get(FACT_KEYS.COST_BAND)?.factValue;
              const fleetAircraft = latestFacts.get(FACT_KEYS.FLEET_AIRCRAFT)
                ?.factValue;
              const rating = latestFacts.get(FACT_KEYS.RATING)?.factValue;
              const ratingCount = latestFacts.get(FACT_KEYS.RATING_COUNT)
                ?.factValue;
              const photos = latestFacts.get(FACT_KEYS.PHOTOS)?.factValue;

              return {
                ...school,
                facts: {
                  programs,
                  costBand:
                    typeof costBand === "string" ? costBand : undefined,
                  fleetAircraft: Array.isArray(fleetAircraft)
                    ? fleetAircraft
                    : undefined,
                  rating:
                    typeof rating === "number" ? rating : undefined,
                  ratingCount:
                    typeof ratingCount === "number" ? ratingCount : undefined,
                  photos: Array.isArray(photos) ? photos : undefined,
                },
              };
            })
          );

          return schoolsWithFacts;
        }
      }),
  }),

  saved: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const userId = ctx.session.user.id;

      const saved = await ctx.db.query.savedSchools.findMany({
        where: (q, { eq }) => eq(q.userId, userId),
      });

      return saved.map((s) => s.schoolId);
    }),

    toggle: protectedProcedure
      .input(z.object({ schoolId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const userId = ctx.session.user.id;

        // Check if already saved
        const existing = await ctx.db
          .select()
          .from(savedSchools)
          .where(
            and(
              eq(savedSchools.userId, userId),
              eq(savedSchools.schoolId, input.schoolId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Delete (unsave)
          await ctx.db
            .delete(savedSchools)
            .where(
              and(
                eq(savedSchools.userId, userId),
                eq(savedSchools.schoolId, input.schoolId)
              )
            );
          return { saved: false };
        } else {
          // Insert (save)
          await ctx.db.insert(savedSchools).values({
            userId,
            schoolId: input.schoolId,
          });
          return { saved: true };
        }
      }),
  }),

  compare: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const userId = ctx.session.user.id;

      // Get most recent comparison for user
      const comparison = await ctx.db
        .select()
        .from(comparisons)
        .where(eq(comparisons.userId, userId))
        .orderBy(desc(comparisons.createdAt))
        .limit(1);

      if (comparison.length === 0) {
        return null;
      }

      return { schoolIds: comparison[0]!.schoolIds };
    }),

    set: protectedProcedure
      .input(
        z.object({
          schoolIds: z
            .array(z.string().uuid())
            .min(1)
            .max(4, "Maximum 4 schools can be compared"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const userId = ctx.session.user.id;

        // Check if comparison exists for user
        const existing = await ctx.db
          .select()
          .from(comparisons)
          .where(eq(comparisons.userId, userId))
          .orderBy(desc(comparisons.createdAt))
          .limit(1);

        if (existing.length > 0) {
          // Update existing comparison
          await ctx.db
            .update(comparisons)
            .set({
              schoolIds: input.schoolIds,
            })
            .where(eq(comparisons.id, existing[0]!.id));
        } else {
          // Insert new comparison
          await ctx.db.insert(comparisons).values({
            id: crypto.randomUUID(),
            userId,
            schoolIds: input.schoolIds,
          });
        }

        return { schoolIds: input.schoolIds };
      }),
  }),
});
