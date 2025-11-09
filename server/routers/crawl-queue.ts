import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { eq, desc } from "drizzle-orm";
import { processCrawlQueue } from "@/lib/crawl-worker";

export const crawlQueueRouter = router({
  enqueue: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        domain: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(crawlQueue).values({
        id: crypto.randomUUID(),
        schoolId: input.schoolId,
        domain: input.domain,
        status: "pending",
        attempts: 0,
        scheduledAt: new Date(),
      });
      return { ok: true };
    }),
  listPending: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(25) }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 25;
      return ctx.db.query.crawlQueue.findMany({
        where: (q, { eq }) => eq(q.status, "pending"),
        limit,
        orderBy: [desc(crawlQueue.scheduledAt)],
      });
    }),
  listFailed: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(25) }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 25;
      return ctx.db.query.crawlQueue.findMany({
        where: (q, { eq }) => eq(q.status, "failed"),
        limit,
        orderBy: [desc(crawlQueue.updatedAt)],
      });
    }),
  retry: protectedProcedure
    .input(z.object({ queueId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const queueItem = await ctx.db.query.crawlQueue.findFirst({
        where: (q, { eq }) => eq(q.id, input.queueId),
      });

      if (!queueItem) {
        throw new Error("Queue item not found");
      }

      if (queueItem.status !== "failed") {
        throw new Error("Can only retry failed items");
      }

      await ctx.db
        .update(crawlQueue)
        .set({
          status: "pending",
          attempts: queueItem.attempts + 1,
          scheduledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(crawlQueue.id, input.queueId));

      return { ok: true };
    }),
  process: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(20) }).optional()
    )
    .mutation(async ({ input }) => {
      const limit = input?.limit ?? 20;
      return await processCrawlQueue(limit);
    }),
});
