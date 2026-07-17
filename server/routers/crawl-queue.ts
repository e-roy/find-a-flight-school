import { router, adminProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { processJob } from "@/lib/crawl-worker";
import { STALE_CRAWL_MS } from "@/lib/crawl-constants";

/**
 * Throw CONFLICT if this school already has a live (non-stale) crawl in flight.
 * Rows older than STALE_CRAWL_MS are dead (server restarted mid-crawl) and may
 * be replaced.
 */
export async function assertNoLiveCrawl(
  db: typeof import("@/lib/db").db,
  schoolId: string
) {
  const existing = await db.query.crawlQueue.findFirst({
    where: (q, { eq }) => eq(q.schoolId, schoolId),
  });
  if (
    existing &&
    (existing.status === "pending" || existing.status === "processing") &&
    Date.now() - existing.updatedAt.getTime() < STALE_CRAWL_MS
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A crawl is already running for this school.",
    });
  }
}

export const crawlQueueRouter = router({
  /**
   * Synchronously crawl + extract a single school (admin-only). Used by both
   * "Crawl now" (Schools page) and "Re-crawl" (Crawl Failures log). Keeps one
   * crawl_queue row per school reflecting its latest attempt, so the Schools
   * status column and the failures log stay accurate.
   */
  crawlSchool: adminProcedure
    .input(z.object({ schoolId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const school = await ctx.db.query.schools.findFirst({
        where: (s, { eq }) => eq(s.id, input.schoolId),
      });
      if (!school) {
        throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
      }
      if (!school.domain) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "School has no domain to crawl",
        });
      }

      const url = school.domain.startsWith("http")
        ? school.domain
        : `https://${school.domain}`;

      await assertNoLiveCrawl(ctx.db, school.id);

      // Replace any prior attempt for this school so there's one row per school.
      await ctx.db.delete(crawlQueue).where(eq(crawlQueue.schoolId, school.id));

      const id = crypto.randomUUID();
      await ctx.db.insert(crawlQueue).values({
        id,
        schoolId: school.id,
        domain: url,
        status: "pending",
        attempts: 0,
        scheduledAt: new Date(),
      });

      const job = await ctx.db.query.crawlQueue.findFirst({
        where: (q, { eq }) => eq(q.id, id),
      });
      if (!job) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create crawl job",
        });
      }

      return processJob(job);
    }),

  /** Schools whose latest crawl attempt failed (the Crawl Failures log). */
  listFailed: adminProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(50) }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      return ctx.db.query.crawlQueue.findMany({
        where: (q, { eq }) => eq(q.status, "failed"),
        limit,
        orderBy: [desc(crawlQueue.updatedAt)],
      });
    }),
});
