import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { hasRole } from "@/lib/rbac";
import { z } from "zod";
import { factsRouter } from "./facts";
import { crawlQueueRouter } from "./crawl-queue";
import { seedsRouter } from "./seeds";
import { dedupeRouter } from "./dedupe";
import { signalsRouter } from "./signals";
import { snapshotsRouter } from "./snapshots";

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

  seeds: router({
    list: isAdmin
      .input(
        z.object({ limit: z.number().min(1).max(100).default(50) }).optional()
      )
      .query(async ({ ctx, input }) => {
        const caller = seedsRouter.createCaller(ctx);
        return caller.list(input);
      }),
  }),

  dedupe: router({
    run: isAdmin
      .input(z.object({ clusterId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const caller = dedupeRouter.createCaller(ctx);
        return caller.approveMerge(input);
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
});
