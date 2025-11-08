import { router, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { signalsMock } from "@/db/schema/signals_mock";
import { desc } from "drizzle-orm";

export const schoolsRouter = router({
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.schools.findFirst({
        where: (q, { eq }) => eq(q.id, input.id),
      });
    }),
  byIdWithFacts: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const school = await ctx.db.query.schools.findFirst({
        where: (q, { eq }) => eq(q.id, input.id),
      });

      if (!school) {
        return null;
      }

      // Get all facts for this school, ordered by asOf descending
      const allFacts = await ctx.db.query.facts.findMany({
        where: (q, { eq }) => eq(q.schoolId, input.id),
        orderBy: (facts, { desc }) => [desc(facts.asOf)],
      });

      // Group by fact_key and keep only the latest (first) fact per key
      const latestFactsByKey = new Map<string, (typeof allFacts)[0]>();
      for (const fact of allFacts) {
        if (!latestFactsByKey.has(fact.factKey)) {
          latestFactsByKey.set(fact.factKey, fact);
        }
      }

      const latestFacts = Array.from(latestFactsByKey.values());

      // Calculate oldest asOf date
      const oldestAsOf =
        latestFacts.length > 0
          ? latestFacts.reduce((oldest, fact) => {
              return fact.asOf < oldest ? fact.asOf : oldest;
            }, latestFacts[0]!.asOf)
          : null;

      // Get signals_mock data for this school
      const signals = await ctx.db.query.signalsMock.findFirst({
        where: (q, { eq }) => eq(q.schoolId, input.id),
      });

      return {
        school,
        facts: latestFacts,
        oldestAsOf,
        signals: signals || null,
      };
    }),
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      try {
        // Try using the relational query API first
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
});
