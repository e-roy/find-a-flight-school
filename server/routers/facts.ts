import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { facts } from "@/db/schema/facts";
import { eq, desc, and, ilike } from "drizzle-orm";

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
  listPending: publicProcedure
    .input(
      z
        .object({ limit: z.number().min(1).max(100).default(50) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      return ctx.db.query.facts.findMany({
        where: (q, { eq, and, ilike }) =>
          and(
            eq(q.moderationStatus, "PENDING"),
            // Only show claim-sourced facts
            ilike(q.provenance, "%CLAIM%")
          ),
        limit,
        orderBy: [desc(facts.createdAt)],
      });
    }),
  moderate: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        factKey: z.string(),
        asOf: z.string(), // ISO string for date
        status: z.enum(["APPROVED", "REJECTED"]),
        verifiedBy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update moderation status for the specific fact
      // Since facts are append-only, we update the moderation status
      // by creating a new fact entry with updated moderation status
      // Get the most recent fact for this school/factKey
      const existingFact = await ctx.db.query.facts.findFirst({
        where: (q, { eq, and }) =>
          and(
            eq(q.schoolId, input.schoolId),
            eq(q.factKey, input.factKey)
          ),
        orderBy: [desc(facts.asOf)],
      });

      if (!existingFact) {
        throw new Error("Fact not found");
      }

      // Append-only: create new fact with updated moderation status
      await ctx.db.insert(facts).values({
        schoolId: existingFact.schoolId,
        factKey: existingFact.factKey,
        factValue: existingFact.factValue,
        provenance: existingFact.provenance,
        moderationStatus: input.status,
        verifiedBy: input.verifiedBy ?? ctx.session?.user?.email ?? null,
        verifiedAt: input.status === "APPROVED" ? new Date() : null,
        asOf: new Date(), // New asOf for the moderated version
      });

      return { ok: true };
    }),
});

