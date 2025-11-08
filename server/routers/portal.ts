import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { claims } from "@/db/schema/claims";
import { leads } from "@/db/schema/leads";
import { eventsViews } from "@/db/schema/events_views";
import { eventsFinancing } from "@/db/schema/events_financing";
import { eventsMatchAppearances } from "@/db/schema/events_match_appearances";
import { eq, and, desc, count } from "drizzle-orm";
import type { Context } from "@/lib/trpc/context";

/**
 * Helper function to get the school ID for the logged-in school user.
 * Queries claims table by user email, filters by VERIFIED status.
 */
async function getSchoolIdForUser(ctx: Context): Promise<string> {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User email not found in session",
    });
  }

  const userEmail = ctx.session.user.email;

  const claim = await ctx.db.query.claims.findFirst({
    where: (q, { eq, and }) =>
      and(eq(q.email, userEmail), eq(q.status, "VERIFIED")),
  });

  if (!claim) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No verified claim found for this user",
    });
  }

  return claim.schoolId;
}

export const portalRouter = router({
  profile: {
    get: protectedProcedure.query(async ({ ctx }) => {
      const schoolId = await getSchoolIdForUser(ctx);

      // Get school data
      const school = await ctx.db.query.schools.findFirst({
        where: (q, { eq }) => eq(q.id, schoolId),
      });

      if (!school) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "School not found",
        });
      }

      // Get all facts for this school, ordered by asOf descending
      const allFacts = await ctx.db.query.facts.findMany({
        where: (q, { eq, and }) =>
          and(eq(q.schoolId, schoolId), eq(q.moderationStatus, "APPROVED")),
        orderBy: [desc(facts.asOf)],
      });

      // Group facts by key to find the most recent approved fact per key
      const latestFactsByKey = new Map<string, (typeof allFacts)[0]>();
      for (const fact of allFacts) {
        if (!latestFactsByKey.has(fact.factKey)) {
          latestFactsByKey.set(fact.factKey, fact);
        }
      }

      return {
        school,
        facts: Array.from(latestFactsByKey.values()),
      };
    }),
    proposeFacts: protectedProcedure
      .input(
        z.object({
          facts: z.array(
            z.object({
              factKey: z.string(),
              factValue: z.union([
                z.string(),
                z.array(z.string()),
                z.number(),
                z.null(),
              ]),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const schoolId = await getSchoolIdForUser(ctx);

        // Verify school exists
        const school = await ctx.db.query.schools.findFirst({
          where: (q, { eq }) => eq(q.id, schoolId),
        });

        if (!school) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "School not found",
          });
        }

        const now = new Date();

        // Insert facts with CLAIM provenance and PENDING moderation status
        const factsToInsert = input.facts.map((fact) => ({
          schoolId,
          factKey: fact.factKey,
          factValue: fact.factValue,
          provenance: "CLAIM" as const,
          moderationStatus: "PENDING" as const,
          asOf: now,
        }));

        await ctx.db.insert(facts).values(factsToInsert);

        return {
          success: true,
          inserted: factsToInsert.length,
          message: "Facts submitted for moderation",
        };
      }),
  },
  leads: {
    list: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(20),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const schoolId = await getSchoolIdForUser(ctx);
        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;

        // Use standard query builder for proper pagination
        const { count } = await import("drizzle-orm");

        // Get total count
        const totalResult = await ctx.db
          .select({ count: count() })
          .from(leads)
          .where(eq(leads.schoolId, schoolId));
        const total = totalResult[0]?.count ?? 0;

        // Get paginated leads
        const paginatedLeads = await ctx.db
          .select()
          .from(leads)
          .where(eq(leads.schoolId, schoolId))
          .orderBy(desc(leads.createdAt))
          .limit(limit)
          .offset(offset);

        return {
          leads: paginatedLeads,
          total,
          limit,
          offset,
        };
      }),
  },
  analytics: {
    get: protectedProcedure.query(async ({ ctx }) => {
      const schoolId = await getSchoolIdForUser(ctx);

      // Get views count
      const viewsResult = await ctx.db
        .select({ count: count() })
        .from(eventsViews)
        .where(eq(eventsViews.schoolId, schoolId));
      const views = viewsResult[0]?.count ?? 0;

      // Get financing clicks count
      const financingResult = await ctx.db
        .select({ count: count() })
        .from(eventsFinancing)
        .where(eq(eventsFinancing.schoolId, schoolId));
      const financingClicks = financingResult[0]?.count ?? 0;

      // Get match appearances count
      const matchResult = await ctx.db
        .select({ count: count() })
        .from(eventsMatchAppearances)
        .where(eq(eventsMatchAppearances.schoolId, schoolId));
      const matchAppearances = matchResult[0]?.count ?? 0;

      // Get leads count
      const leadsResult = await ctx.db
        .select({ count: count() })
        .from(leads)
        .where(eq(leads.schoolId, schoolId));
      const leadsCount = leadsResult[0]?.count ?? 0;

      // Calculate CTR: (leads + financing clicks) / views
      // If views is 0, CTR is 0
      const ctr = views > 0 ? ((leadsCount + financingClicks) / views) * 100 : 0;

      return {
        views,
        ctr: Math.round(ctr * 100) / 100, // Round to 2 decimal places
        matchAppearances,
        financingClicks,
        leads: leadsCount,
      };
    }),
  },
});
