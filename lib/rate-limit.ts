/**
 * Per-IP fixed-window rate limiting, backed by the shared `api_usage` table
 * (no Redis/Upstash). Fails CLOSED: if the counter cannot be reached the request
 * is rejected, so an unauthenticated paid endpoint can't be hammered during an
 * outage.
 */
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiUsage } from "@/db/schema/api_usage";

interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
  /** Short name used to namespace the counter key (e.g. "discover"). */
  name: string;
}

export async function enforceRateLimit(
  ip: string,
  { limit, windowSec, name }: RateLimitOptions
): Promise<void> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${name}:${ip}:${bucket}`;

  let count: number;
  try {
    const rows = await db
      .insert(apiUsage)
      .values({ key, count: 1, windowStart: new Date() })
      .onConflictDoUpdate({
        target: apiUsage.key,
        set: { count: sql`${apiUsage.count} + 1`, updatedAt: new Date() },
      })
      .returning({ count: apiUsage.count });
    count = rows[0]?.count ?? 1;
  } catch (error) {
    console.error("Rate limiter unavailable (failing closed):", error);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Service is busy. Please try again in a moment.",
    });
  }

  if (count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please wait a moment and try again.",
    });
  }
}
