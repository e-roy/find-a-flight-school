import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { hasRole } from "@/lib/rbac";
import { z } from "zod";
import { factsRouter } from "./facts";
import { crawlQueueRouter } from "./crawl-queue";
import { signalsRouter } from "./signals";
import { snapshotsRouter } from "./snapshots";
import { schools } from "@/db/schema/schools";
import { sources } from "@/db/schema/sources";
import { eq, isNull, and, desc } from "drizzle-orm";
import { FACT_KEYS } from "@/types";

/**
 * Middleware to check if user has admin role
 * hasRole is now synchronous (reads from session)
 */
const isAdmin = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userIsAdmin = hasRole(ctx.session, "admin");
  if (!userIsAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin role required",
    });
  }

  return next();
});

export const adminRouter = router({
  facts: router({
    moderate: isAdmin
      .input(
        z.object({
          schoolId: z.string().uuid(),
          factKey: z.string(),
          asOf: z.string(),
          status: z.enum(["APPROVED", "REJECTED"]),
          verifiedBy: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const caller = factsRouter.createCaller(ctx);
        return caller.moderate(input);
      }),
    listPending: isAdmin
      .input(
        z.object({ limit: z.number().min(1).max(100).default(50) }).optional()
      )
      .query(async ({ ctx, input }) => {
        const caller = factsRouter.createCaller(ctx);
        return caller.listPending(input);
      }),
  }),

  queue: router({
    retry: isAdmin
      .input(z.object({ queueId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const caller = crawlQueueRouter.createCaller(ctx);
        return caller.retry(input);
      }),
    list: isAdmin
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(25),
            includeFailed: z.boolean().default(true),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const caller = crawlQueueRouter.createCaller(ctx);
        const limit = input?.limit ?? 25;
        const [pending, failed] = await Promise.all([
          caller.listPending({ limit }),
          input?.includeFailed !== false ? caller.listFailed({ limit }) : [],
        ]);
        return {
          pending,
          failed,
          totalPending: pending.length,
          totalFailed: failed.length,
        };
      }),
    process: isAdmin
      .input(
        z.object({ limit: z.number().min(1).max(100).default(20) }).optional()
      )
      .mutation(async ({ ctx, input }) => {
        const caller = crawlQueueRouter.createCaller(ctx);
        return caller.process(input);
      }),
  }),

  signals: router({
    set: isAdmin
      .input(
        z.object({
          schoolId: z.string().uuid(),
          signalKey: z.string(),
          value: z.any(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const caller = signalsRouter.createCaller(ctx);
        return caller.set(input);
      }),
  }),

  snapshots: router({
    get: isAdmin
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const caller = snapshotsRouter.createCaller(ctx);
        return caller.list(input);
      }),
  }),

  backfillGooglePlaceIds: isAdmin.mutation(async ({ ctx }) => {
    // Find all schools that don't have googlePlaceId
    const schoolsWithoutPlaceId = await ctx.db
      .select()
      .from(schools)
      .where(isNull(schools.googlePlaceId));

    let updated = 0;
    let skipped = 0;
    const errors: Array<{ schoolId: string; error: string }> = [];

    for (const school of schoolsWithoutPlaceId) {
      try {
        let placeId: string | null = null;

        // First, try to get from facts (for newer imports)
        const placeIdFact = await ctx.db.query.facts.findFirst({
          where: (q, { and, eq }) =>
            and(
              eq(q.schoolId, school.id),
              eq(q.factKey, FACT_KEYS.GOOGLE_PLACE_ID)
            ),
          orderBy: (facts, { desc }) => [desc(facts.asOf)],
        });

        if (placeIdFact && typeof placeIdFact.factValue === "string") {
          placeId = placeIdFact.factValue;
        } else {
          // Fallback: check sources table for older imports
          const sourceRecord = await ctx.db.query.sources.findFirst({
            where: (q, { and, eq }) =>
              and(
                eq(q.schoolId, school.id),
                eq(q.sourceType, "PLACES")
              ),
            orderBy: (sources, { desc }) => [desc(sources.collectedAt)],
          });

          if (sourceRecord?.sourceRef && typeof sourceRecord.sourceRef === "string") {
            placeId = sourceRecord.sourceRef;
          }
        }

        if (!placeId) {
          skipped++;
          continue;
        }

        // Also try to get coordinates from facts
        const coordinatesFact = await ctx.db.query.facts.findFirst({
          where: (q, { and, eq }) =>
            and(
              eq(q.schoolId, school.id),
              eq(q.factKey, FACT_KEYS.GOOGLE_COORDINATES)
            ),
          orderBy: (facts, { desc }) => [desc(facts.asOf)],
        });

        let lat: number | null = school.lat;
        let lng: number | null = school.lng;

        if (coordinatesFact && coordinatesFact.factValue) {
          const coords = coordinatesFact.factValue as { lat: number; lng: number };
          if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        // Update school record
        await ctx.db
          .update(schools)
          .set({
            googlePlaceId: placeId,
            lat: lat,
            lng: lng,
            updatedAt: new Date(),
          })
          .where(eq(schools.id, school.id));

        updated++;
      } catch (error) {
        errors.push({
          schoolId: school.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: schoolsWithoutPlaceId.length,
      updated,
      skipped,
      errors,
    };
  }),
});
