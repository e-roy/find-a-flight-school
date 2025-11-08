import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { seedCandidates } from "@/db/schema/seeds";
import { desc, or, ilike, eq } from "drizzle-orm";
import { resolveDomain } from "@/lib/resolver";

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
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const searchTerm = `%${input.query}%`;
      return ctx.db
        .select()
        .from(seedCandidates)
        .where(
          or(
            ilike(seedCandidates.name, searchTerm),
            ilike(seedCandidates.city, searchTerm),
            ilike(seedCandidates.state, searchTerm)
          )
        )
        .orderBy(desc(seedCandidates.createdAt))
        .limit(100);
    }),
  rerunResolver: protectedProcedure
    .input(z.object({ seedId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const seed = await ctx.db.query.seedCandidates.findFirst({
        where: (q, { eq }) => eq(q.id, input.seedId),
      });

      if (!seed) {
        throw new Error("Seed candidate not found");
      }

      const resolveResult = await resolveDomain({
        name: seed.name,
        city: seed.city ?? undefined,
        state: seed.state ?? undefined,
        phone: seed.phone ?? undefined,
      });

      const updateData: {
        website?: string | null;
        resolutionMethod: string;
        confidence: number;
        evidenceJson: unknown;
        lastSeenAt: Date;
        updatedAt: Date;
      } = {
        resolutionMethod: "pattern_match",
        confidence: resolveResult.confidence,
        evidenceJson: resolveResult.evidence,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      };

      if (resolveResult.domain) {
        updateData.website = resolveResult.domain;
      }

      // Only update if new confidence is better or existing is null
      if (seed.confidence === null || resolveResult.confidence > seed.confidence) {
        await ctx.db
          .update(seedCandidates)
          .set(updateData)
          .where(eq(seedCandidates.id, input.seedId));
      } else {
        // Still update last_seen_at even if confidence didn't improve
        await ctx.db
          .update(seedCandidates)
          .set({
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(seedCandidates.id, input.seedId));
      }

      return {
        ok: true,
        domain: resolveResult.domain,
        confidence: resolveResult.confidence,
      };
    }),
});

