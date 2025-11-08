/**
 * Refresh and drift detection utilities
 * Handles staleness policies and snapshot change detection
 */

import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { snapshots } from "@/db/schema/snapshots";
import { facts } from "@/db/schema/facts";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { FACT_KEYS } from "@/types";
import { eq, and, isNotNull, sql, desc, or } from "drizzle-orm";
import { normalizeSnapshot } from "@/lib/normalize";

// Staleness thresholds
const STALENESS_THRESHOLD_UNVERIFIED_DAYS = 7;
const STALENESS_THRESHOLD_VERIFIED_DAYS = 90;

/**
 * Get schools that need refresh based on staleness policy
 * - New/unverified schools: last snapshot > 7 days old OR no snapshots
 * - Verified schools: last snapshot > 90 days old
 */
export async function getStaleSchools(limit: number): Promise<
  Array<{
    id: string;
    domain: string | null;
    isVerified: boolean;
    lastSnapshotAsOf: Date | null;
  }>
> {
  const now = new Date();
  const unverifiedThreshold = new Date(
    now.getTime() - STALENESS_THRESHOLD_UNVERIFIED_DAYS * 24 * 60 * 60 * 1000
  );
  const verifiedThreshold = new Date(
    now.getTime() - STALENESS_THRESHOLD_VERIFIED_DAYS * 24 * 60 * 60 * 1000
  );

  // Get all schools with their latest snapshot and verification status
  const allSchools = await db
    .select({
      id: schools.id,
      domain: schools.domain,
    })
    .from(schools)
    .where(isNotNull(schools.domain));

  const staleSchools: Array<{
    id: string;
    domain: string | null;
    isVerified: boolean;
    lastSnapshotAsOf: Date | null;
  }> = [];

  for (const school of allSchools) {
    if (!school.domain) continue;

    // Get latest snapshot for this school
    const latestSnapshot = await db
      .select({
        asOf: snapshots.asOf,
      })
      .from(snapshots)
      .where(eq(snapshots.schoolId, school.id))
      .orderBy(desc(snapshots.asOf))
      .limit(1);

    const lastSnapshotAsOf = latestSnapshot[0]?.asOf ?? null;

    // Check if school has verified facts
    const verifiedFact = await db
      .select()
      .from(facts)
      .where(and(eq(facts.schoolId, school.id), isNotNull(facts.verifiedAt)))
      .limit(1);

    const isVerified = verifiedFact.length > 0;

    // Determine if school is stale
    let isStale = false;

    if (!lastSnapshotAsOf) {
      // No snapshots - always stale
      isStale = true;
    } else if (isVerified) {
      // Verified school: stale if > 90 days
      isStale = lastSnapshotAsOf < verifiedThreshold;
    } else {
      // Unverified school: stale if > 7 days
      isStale = lastSnapshotAsOf < unverifiedThreshold;
    }

    if (isStale) {
      staleSchools.push({
        id: school.id,
        domain: school.domain,
        isVerified,
        lastSnapshotAsOf,
      });
    }

    if (staleSchools.length >= limit) {
      break;
    }
  }

  return staleSchools;
}

/**
 * Enqueue stale schools for refresh
 */
export async function enqueueStaleSchools(limit: number): Promise<{
  enqueued: number;
  skipped: number;
  errors: Array<{ schoolId: string; error: string }>;
}> {
  const staleSchools = await getStaleSchools(limit);

  const results = {
    enqueued: 0,
    skipped: 0,
    errors: [] as Array<{ schoolId: string; error: string }>,
  };

  for (const school of staleSchools) {
    if (!school.domain) {
      results.skipped++;
      continue;
    }

    try {
      // Check if there's already a pending or processing job for this school
      const existingJob = await db
        .select()
        .from(crawlQueue)
        .where(
          and(
            eq(crawlQueue.schoolId, school.id),
            or(
              eq(crawlQueue.status, "pending"),
              eq(crawlQueue.status, "processing")
            )
          )
        )
        .limit(1);

      if (existingJob.length > 0) {
        results.skipped++;
        continue;
      }

      // Create crawl queue entry
      const queueId = crypto.randomUUID();
      await db.insert(crawlQueue).values({
        id: queueId,
        schoolId: school.id,
        domain: school.domain,
        status: "pending",
        attempts: 0,
        scheduledAt: new Date(),
      });

      results.enqueued++;
    } catch (error) {
      results.errors.push({
        schoolId: school.id,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  return results;
}

/**
 * Compare two fact values for equality
 */
function factValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }

  return false;
}

/**
 * Detect changes in pricing/fleet facts between latest and previous snapshot
 * Returns list of fact keys that changed
 */
export async function detectSnapshotChanges(
  schoolId: string
): Promise<string[]> {
  // Get latest two snapshots for this school
  const recentSnapshots = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.schoolId, schoolId))
    .orderBy(desc(snapshots.asOf))
    .limit(2);

  if (recentSnapshots.length < 2) {
    // No previous snapshot to compare
    return [];
  }

  const latestSnapshot = recentSnapshots[0]!;
  const previousSnapshot = recentSnapshots[1]!;

  if (!latestSnapshot.rawJson || !previousSnapshot.rawJson) {
    return [];
  }

  // Normalize both snapshots
  const latestFacts = normalizeSnapshot(
    latestSnapshot.rawJson as Record<string, unknown>,
    latestSnapshot.asOf
  );
  const previousFacts = normalizeSnapshot(
    previousSnapshot.rawJson as Record<string, unknown>,
    previousSnapshot.asOf
  );

  // Track facts by key
  const latestFactsByKey = new Map<string, unknown>();
  const previousFactsByKey = new Map<string, unknown>();

  for (const fact of latestFacts) {
    latestFactsByKey.set(fact.factKey, fact.factValue);
  }

  for (const fact of previousFacts) {
    previousFactsByKey.set(fact.factKey, fact.factValue);
  }

  // Check for changes in pricing/fleet fact keys
  const pricingFleetKeys = [
    FACT_KEYS.COST_BAND,
    FACT_KEYS.COST_NOTES,
    FACT_KEYS.FLEET_AIRCRAFT,
    FACT_KEYS.FLEET_COUNT,
  ];

  const changedKeys: string[] = [];

  for (const key of pricingFleetKeys) {
    const latestValue = latestFactsByKey.get(key);
    const previousValue = previousFactsByKey.get(key);

    // Changed if:
    // 1. Value exists in latest but not in previous
    // 2. Value exists in previous but not in latest
    // 3. Values are different
    if (latestValue !== previousValue) {
      if (
        (latestValue !== undefined && previousValue === undefined) ||
        (latestValue === undefined && previousValue !== undefined) ||
        !factValuesEqual(latestValue, previousValue)
      ) {
        changedKeys.push(key);
      }
    }
  }

  return changedKeys;
}
