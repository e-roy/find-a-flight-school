import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedCandidates } from "@/db/schema/seeds";
import { ResolveQuerySchema } from "@/lib/validation";
import { resolveDomain } from "@/lib/resolver";
import { or, isNull, lt, sql, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryData = ResolveQuerySchema.parse({
      limit: searchParams.get("limit") ?? 50,
    });

    // Query unresolved seeds
    // WHERE website IS NULL OR confidence < 0.7
    // ORDER BY last_seen_at ASC NULLS FIRST
    // LIMIT ?
    const unresolvedSeeds = await db
      .select()
      .from(seedCandidates)
      .where(
        or(
          isNull(seedCandidates.website),
          lt(seedCandidates.confidence, 0.7)
        )
      )
      .orderBy(
        sql`${seedCandidates.lastSeenAt} ASC NULLS FIRST`
      )
      .limit(queryData.limit);

    const results = {
      processed: 0,
      found: 0,
      missed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // Process each seed
    for (const seed of unresolvedSeeds) {
      results.processed++;

      try {
        // Skip if already has high confidence
        if (seed.confidence !== null && seed.confidence >= 0.7) {
          continue;
        }

        const resolveResult = await resolveDomain({
          name: seed.name,
          city: seed.city ?? undefined,
          state: seed.state ?? undefined,
          phone: seed.phone ?? undefined,
        });

        // Update seed record
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

        // Only update website if we found a domain
        if (resolveResult.domain) {
          updateData.website = resolveResult.domain;
          results.found++;
        } else {
          // Mark as processed but not found
          results.missed++;
        }

        // Only update if new confidence is better or existing is null
        if (
          seed.confidence === null ||
          resolveResult.confidence > seed.confidence
        ) {
          await db
            .update(seedCandidates)
            .set(updateData)
            .where(eq(seedCandidates.id, seed.id));
        } else {
          // Still update last_seen_at even if confidence didn't improve
          await db
            .update(seedCandidates)
            .set({
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(seedCandidates.id, seed.id));
        }
      } catch (error) {
        results.errors.push({
          id: seed.id,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
        // Mark as processed even on error
        await db
          .update(seedCandidates)
          .set({
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(seedCandidates.id, seed.id));
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 400 }
    );
  }
}

