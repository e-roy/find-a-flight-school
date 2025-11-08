import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { snapshots } from "@/db/schema/snapshots";
import { facts } from "@/db/schema/facts";
import { NormalizeRunQuerySchema } from "@/lib/validation";
import { normalizeSnapshot } from "@/lib/normalize";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    // Auth guard
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryData = NormalizeRunQuerySchema.parse({
      limit: searchParams.get("limit") ?? 20,
    });

    // Find snapshots with rawJson that haven't been normalized yet
    // A snapshot is considered normalized if it has at least one fact with matching schoolId and asOf
    const allSnapshots = await db
      .select()
      .from(snapshots)
      .where(sql`${snapshots.rawJson} IS NOT NULL`)
      .orderBy(sql`${snapshots.asOf} ASC`)
      .limit(queryData.limit * 2); // Get more to filter out already normalized ones

    // Filter to only snapshots without existing facts
    const unnormalizedSnapshots: (typeof allSnapshots)[0][] = [];

    for (const snapshot of allSnapshots) {
      if (!snapshot.rawJson) continue;

      // Check if facts already exist for this snapshot (same schoolId and asOf)
      const existingFacts = await db
        .select()
        .from(facts)
        .where(
          sql`${facts.schoolId} = ${snapshot.schoolId} AND ${facts.asOf} = ${snapshot.asOf}`
        )
        .limit(1);

      if (existingFacts.length === 0) {
        unnormalizedSnapshots.push(snapshot);
        if (unnormalizedSnapshots.length >= queryData.limit) {
          break;
        }
      }
    }

    const results = {
      processed: 0,
      inserted: 0,
      errors: [] as Array<{ snapshotId: string; error: string }>,
    };

    // Process each snapshot
    for (const snapshot of unnormalizedSnapshots) {
      results.processed++;

      try {
        if (!snapshot.rawJson || typeof snapshot.rawJson !== "object") {
          results.errors.push({
            snapshotId: snapshot.id,
            error: "Invalid rawJson: not an object",
          });
          continue;
        }

        // Normalize the snapshot
        const normalizedFacts = normalizeSnapshot(
          snapshot.rawJson as Record<string, unknown>,
          snapshot.asOf
        );

        if (normalizedFacts.length === 0) {
          // No facts extracted, skip silently
          continue;
        }

        // Insert facts
        const factsToInsert = normalizedFacts.map((fact) => ({
          schoolId: snapshot.schoolId,
          factKey: fact.factKey,
          factValue: fact.factValue,
          provenance: "CRAWL" as const,
          asOf: snapshot.asOf,
        }));

        await db.insert(facts).values(factsToInsert);

        results.inserted += factsToInsert.length;
      } catch (error) {
        results.errors.push({
          snapshotId: snapshot.id,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
