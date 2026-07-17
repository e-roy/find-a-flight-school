/**
 * Global monthly budget meter for billable Google Places API calls.
 *
 * The cap defaults below Google's free monthly tier (5,000 Pro events), so the
 * Places bill stays at $0 even under abuse. The public path ENFORCES the cap and
 * fails CLOSED (denies on over-cap or on any DB error); admin/cron paths only
 * METER usage so legitimate operator work is never blocked by a transient error.
 */
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiUsage } from "@/db/schema/api_usage";

export const PLACES_MONTHLY_CAP = Number(process.env.PLACES_MONTHLY_CAP ?? 4500);

function monthKey(): string {
  // e.g. "places:2026-06" — month boundary auto-resets the counter.
  return `places:${new Date().toISOString().slice(0, 7)}`;
}

/** Atomically increment this month's counter and return the new total. */
async function bumpMonthly(units: number): Promise<number> {
  const key = monthKey();
  const rows = await db
    .insert(apiUsage)
    .values({ key, count: units, windowStart: new Date() })
    .onConflictDoUpdate({
      target: apiUsage.key,
      set: { count: sql`${apiUsage.count} + ${units}`, updatedAt: new Date() },
    })
    .returning({ count: apiUsage.count });
  return rows[0]?.count ?? units;
}

/**
 * Public path. Increments the meter and throws (fail-closed) if the monthly cap
 * is exceeded or the meter cannot be reached.
 */
export async function consumePlacesBudgetOrThrow(units = 1): Promise<void> {
  let total: number;
  try {
    total = await bumpMonthly(units);
  } catch (error) {
    console.error("Places budget meter unavailable (failing closed):", error);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Search is temporarily unavailable. Please try again later.",
    });
  }
  if (total > PLACES_MONTHLY_CAP) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "We've hit this month's search limit. Please try again next month.",
    });
  }
}

/** Admin/cron path. Counts usage toward the monthly total but never blocks. */
export async function meterPlacesUsage(units = 1): Promise<void> {
  try {
    await bumpMonthly(units);
  } catch (error) {
    console.error("Failed to meter Places usage:", error);
  }
}

/**
 * Remaining budget for this month. Fails closed (returns 0) on error so the cron
 * stops calling Google when the meter is unreachable.
 */
export async function placesBudgetRemaining(): Promise<number> {
  try {
    const rows = await db
      .select({ count: apiUsage.count })
      .from(apiUsage)
      .where(eq(apiUsage.key, monthKey()));
    return Math.max(0, PLACES_MONTHLY_CAP - (rows[0]?.count ?? 0));
  } catch (error) {
    console.error("Failed to read Places budget (assuming exhausted):", error);
    return 0;
  }
}
