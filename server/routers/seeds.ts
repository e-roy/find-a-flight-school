import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { seedCandidates } from "@/db/schema/seeds";
import { desc } from "drizzle-orm";

export const seedsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({ limit: z.number().min(1).max(100).default(50) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      return ctx.db.query.seedCandidates.findMany({
        limit,
        orderBy: [desc(seedCandidates.createdAt)],
      });
    }),
  uploadRow: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        city: z.string().min(1),
        state: z.string().min(2),
        country: z.string().min(2),
        phone: z.string().optional(),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Insert with resolution_method/confidence rules from Phase 1
      await ctx.db.insert(seedCandidates).values({
        id: crypto.randomUUID(),
        name: input.name,
        city: input.city,
        state: input.state,
        country: input.country,
        phone: input.phone,
        website: input.website,
        resolutionMethod: input.website ? "manual" : null,
        confidence: input.website ? 1 : null,
      });
      return { ok: true };
    }),
});

