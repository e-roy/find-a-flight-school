import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { eq } from "drizzle-orm";

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
      z
        .object({ limit: z.number().min(1).max(100).default(25) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 25;
      return ctx.db.query.crawlQueue.findMany({
        where: (q, { eq }) => eq(q.status, "pending"),
        limit,
      });
    }),
});

