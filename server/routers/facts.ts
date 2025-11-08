import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { facts } from "@/db/schema/facts";
import { eq, desc } from "drizzle-orm";

export const factsRouter = router({
  bySchoolId: publicProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        factKey: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.factKey) {
        const factKey = input.factKey; // Type narrowing
        return ctx.db.query.facts.findMany({
          where: (q, { eq, and }) =>
            and(eq(q.schoolId, input.schoolId), eq(q.factKey, factKey)),
          orderBy: [desc(facts.asOf)],
        });
      }
      return ctx.db.query.facts.findMany({
        where: (q, { eq }) => eq(q.schoolId, input.schoolId),
        orderBy: [desc(facts.asOf)],
      });
    }),
  moderate: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        factKey: z.string(),
        verified: z.boolean(),
        verifiedBy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update the most recent fact for this school/factKey
      // Note: This is a simplified version; in production you'd want to append a new fact with updated verification
      const existingFacts = await ctx.db.query.facts.findMany({
        where: (q, { eq, and }) =>
          and(eq(q.schoolId, input.schoolId), eq(q.factKey, input.factKey)),
        orderBy: [desc(facts.asOf)],
        limit: 1,
      });

      if (existingFacts.length > 0) {
        const fact = existingFacts[0];
        // Append-only: create new fact with updated verification
        await ctx.db.insert(facts).values({
          schoolId: fact.schoolId,
          factKey: fact.factKey,
          factValue: fact.factValue,
          provenance: fact.provenance,
          verifiedBy: input.verifiedBy ?? ctx.session?.user?.email ?? null,
          verifiedAt: input.verified ? new Date() : null,
          asOf: new Date(),
        });
      }

      return { ok: true };
    }),
});

