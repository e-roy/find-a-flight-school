import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import {
  getCandidateClusters,
  promoteCandidateToSchool,
} from "@/lib/dedupe";
import { db } from "@/lib/db";
import { sources } from "@/db/schema/sources";
import { eq } from "drizzle-orm";

export const dedupeRouter = router({
  getClusters: publicProcedure.query(async () => {
    return await getCandidateClusters();
  }),
  approveMerge: protectedProcedure
    .input(z.object({ clusterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const clusters = await getCandidateClusters();
      const cluster = clusters.find((c) => c.clusterId === input.clusterId);

      if (!cluster) {
        throw new Error("Cluster not found");
      }

      // Check if already promoted (has source record)
      const existingSource = await db
        .select()
        .from(sources)
        .where(eq(sources.sourceRef, cluster.bestCandidate.id))
        .limit(1);

      if (existingSource.length > 0) {
        throw new Error("Cluster already promoted");
      }

      // Promote the best candidate
      const result = await promoteCandidateToSchool(cluster.bestCandidate.id);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        ok: true,
        schoolId: result.schoolId,
        merged: cluster.candidates.length - 1,
      };
    }),
});

