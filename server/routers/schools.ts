import { router, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { signalsMock } from "@/db/schema/signals_mock";
import { leads } from "@/db/schema/leads";
import { LeadCreateSchema } from "@/lib/validation";
import { desc, eq } from "drizzle-orm";

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

      // Group facts by key to find the most recent fact per key
      const latestFactsByKey = new Map<string, (typeof allFacts)[0]>();
      const allFactsByKey = new Map<string, (typeof allFacts)[0][]>();

      for (const fact of allFacts) {
        // Track latest fact per key (first one encountered is latest due to DESC order)
        if (!latestFactsByKey.has(fact.factKey)) {
          latestFactsByKey.set(fact.factKey, fact);
        }

        // Track all facts per key for staleness detection
        const keyFacts = allFactsByKey.get(fact.factKey) || [];
        keyFacts.push(fact);
        allFactsByKey.set(fact.factKey, keyFacts);
      }

      // Return all facts (not just latest per key) so we can mark old ones as stale
      // Add isStale flag to each fact (true if a newer fact exists for the same key)
      const factsWithStaleFlag = allFacts.map((fact) => {
        const keyFacts = allFactsByKey.get(fact.factKey) || [];
        // Find the most recent fact for this key (first in array since ordered DESC)
        const mostRecentFact = keyFacts[0];
        // Fact is stale if it's not the most recent one for this key
        const isStale = mostRecentFact
          ? fact.asOf.getTime() < mostRecentFact.asOf.getTime()
          : false;
        return {
          ...fact,
          isStale,
        };
      });

      // Get latest facts for calculating oldestAsOf and recentlyUpdated
      const latestFacts = Array.from(latestFactsByKey.values());

      // Calculate oldest asOf date from latest facts per key
      const oldestAsOf =
        latestFacts.length > 0
          ? latestFacts.reduce((oldest, fact) => {
              return fact.asOf < oldest ? fact.asOf : oldest;
            }, latestFacts[0]!.asOf)
          : null;

      // Check if recently updated (any latest fact updated in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentlyUpdated =
        latestFacts.length > 0 &&
        latestFacts.some((fact) => fact.asOf >= thirtyDaysAgo);

      // Get signals_mock data for this school
      const signals = await ctx.db.query.signalsMock.findFirst({
        where: (q, { eq }) => eq(q.schoolId, input.id),
      });

      return {
        school,
        facts: factsWithStaleFlag,
        oldestAsOf,
        recentlyUpdated,
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
  lead: {
    create: publicProcedure
      .input(LeadCreateSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify school exists
        const school = await ctx.db.query.schools.findFirst({
          where: (q, { eq }) => eq(q.id, input.schoolId),
        });

        if (!school) {
          throw new Error("School not found");
        }

        // Insert lead into database
        const leadId = crypto.randomUUID();
        await ctx.db.insert(leads).values({
          id: leadId,
          schoolId: input.schoolId,
          userId: ctx.session?.user?.id || null,
          payloadJson: {
            email: input.email,
            message: input.message,
          },
          createdAt: new Date(),
        });

        return { success: true, id: leadId };
      }),
  },
});
