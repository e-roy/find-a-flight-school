/**
 * Quota checking for admin operations
 * Lightweight quota guards for discover calls and imports
 */

import { db } from "@/lib/db";
import { seedCandidates } from "@/db/schema/seeds";
import { gte, and, eq, sql } from "drizzle-orm";

export interface QuotaResult {
  allowed: boolean;
  remaining?: number;
  resetAt?: Date;
  error?: string;
}

/**
 * Check discover quota (calls per minute)
 * For MVP, we track by checking recent seed_candidates created in the last minute
 * This is a simple approximation - in production you'd want a dedicated quota table
 */
export async function checkDiscoverQuota(
  userId: string,
  maxPerMinute: number = 10
): Promise<QuotaResult> {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    // Count seed candidates created in the last minute
    // Note: This is an approximation since we don't track which admin created which seed
    // For a more accurate implementation, we'd need to add a created_by field to seed_candidates
    const recentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(seedCandidates)
      .where(gte(seedCandidates.createdAt, oneMinuteAgo));

    const count = Number(recentCount[0]?.count ?? 0);

    if (count >= maxPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60 * 1000),
        error: `Discover quota exceeded. Maximum ${maxPerMinute} calls per minute.`,
      };
    }

    return {
      allowed: true,
      remaining: maxPerMinute - count,
      resetAt: new Date(Date.now() + 60 * 1000),
    };
  } catch (error) {
    // On error, allow the operation (fail open)
    console.error("Error checking discover quota:", error);
    return {
      allowed: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check import quota (imports per day)
 * Counts seed candidates created today
 */
export async function checkImportQuota(
  userId: string,
  maxPerDay: number = 50
): Promise<QuotaResult> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Count seed candidates created today
    // Note: This is an approximation since we don't track which admin created which seed
    const todayCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(seedCandidates)
      .where(gte(seedCandidates.createdAt, startOfDay));

    const count = Number(todayCount[0]?.count ?? 0);

    if (count >= maxPerDay) {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      return {
        allowed: false,
        remaining: 0,
        resetAt: endOfDay,
        error: `Import quota exceeded. Maximum ${maxPerDay} imports per day.`,
      };
    }

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return {
      allowed: true,
      remaining: maxPerDay - count,
      resetAt: endOfDay,
    };
  } catch (error) {
    // On error, allow the operation (fail open)
    console.error("Error checking import quota:", error);
    return {
      allowed: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
