import { router, adminProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { snapshotsRouter } from "./snapshots";

// Shared admin-only procedure (auth + admin role).
const isAdmin = adminProcedure;

export const adminRouter = router({
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
