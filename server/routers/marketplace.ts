import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { savedSchools, comparisons } from "@/db/schema";
import { schools } from "@/db/schema/schools";
import { MatchRequestSchema } from "@/lib/validation";
import { eq, and, desc } from "drizzle-orm";

// Search input schema extends MatchRequestSchema with pagination
const SearchInputSchema = MatchRequestSchema.extend({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

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
          return allSchools.slice(offset, offset + limit);
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
          return allSchools.slice(offset, offset + limit);
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
