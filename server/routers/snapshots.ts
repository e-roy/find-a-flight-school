import { router, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { snapshots } from "@/db/schema/snapshots";
import { desc, eq } from "drizzle-orm";

export const snapshotsRouter = router({
  bySchoolId: publicProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.snapshots.findMany({
        where: (q, { eq }) => eq(q.schoolId, input.schoolId),
        limit: input.limit,
        orderBy: [desc(snapshots.asOf)],
      });
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
      return ctx.db.query.snapshots.findMany({
        limit,
        offset,
        orderBy: [desc(snapshots.asOf)],
      });
    }),
});

