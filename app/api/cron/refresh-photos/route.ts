import { NextRequest, NextResponse } from "next/server";
import { refreshStalePhotosBatch } from "@/lib/refresh-school-places";

// Refreshing a batch makes up to BATCH Place Details calls sequentially.
export const maxDuration = 60;

/**
 * Scheduled photo refresh. Re-fetches Google Places data (incl. fresh photo
 * resource names) for schools with a known-broken image first, then the schools
 * whose photos fact is oldest. Bounded by PHOTO_REFRESH_BATCH and the monthly
 * Places budget, so it always stays within the free tier.
 *
 * Triggered by Vercel Cron (which sends `Authorization: Bearer <CRON_SECRET>`)
 * or any external scheduler.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await refreshStalePhotosBatch();
  return NextResponse.json({ ok: true, ...summary });
}
