import { router, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";

export const matchRouter = router({
  run: publicProcedure
    .input(
      z.object({
        location: z
          .object({ lat: z.number(), lng: z.number() })
          .optional(),
        radiusKm: z.number().min(1).max(5000).default(100),
        programs: z
          .array(
            z.enum(["PPL", "IR", "CPL", "CFI", "CFII", "ME"])
          )
          .optional(),
        budgetBand: z.enum(["LOW", "MID", "HIGH"]).optional(),
        aircraft: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Reuse Phase 9 matching logic later; here we return a stubbed filtered list from facts
      // TODO(question): Should we include distance sorting in MVP or filter-only?
      return { results: [] };
    }),
});

