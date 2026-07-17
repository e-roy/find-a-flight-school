/**
 * Drift detection utilities
 * Compares the latest two snapshots for a school to detect pricing/fleet changes.
 */

import { db } from "@/lib/db";
import { snapshots } from "@/db/schema/snapshots";
import { FACT_KEYS } from "@/types";
import { eq, desc } from "drizzle-orm";
import { normalizeSnapshot } from "@/lib/normalize";

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
