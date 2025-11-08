import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";

// Signals router - stubbed for now since signals_mock schema doesn't exist yet
// TODO(question): What should the signals schema look like? What signals do we need to track?
export const signalsRouter = router({
  get: publicProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        signalKey: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Stub implementation - return empty for now
      return { schoolId: input.schoolId, signalKey: input.signalKey, value: null };
    }),
  set: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        signalKey: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Stub implementation - no-op for now
      // TODO(question): Should signals be stored in a separate table or as facts?
      return { ok: true };
    }),
});

