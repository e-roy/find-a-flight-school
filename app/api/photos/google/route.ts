import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { photoHealth } from "@/db/schema/photo_health";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * Record that a school's Google photo failed to load (expired reference) so the
 * refresh cron can prioritize it. Best-effort — never blocks image serving.
 */
async function flagBrokenPhoto(schoolId: string): Promise<void> {
  try {
    await db
      .insert(photoHealth)
      .values({ schoolId, status: "broken", lastCheckedAt: new Date() })
      .onConflictDoUpdate({
        target: photoHealth.schoolId,
        set: { status: "broken", lastCheckedAt: new Date() },
      });
  } catch (error) {
    console.error("Failed to record broken photo:", error);
  }
}

/**
 * Proxy route for Google Places photos
 * Keeps API key server-side and proxies image requests
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const photoName = searchParams.get("name");
  const schoolId = searchParams.get("sid");
  const maxWidth = searchParams.get("maxWidth") || "800";
  const maxHeight = searchParams.get("maxHeight") || "600";

  if (!photoName) {
    return NextResponse.json({ error: "Missing photo name" }, { status: 400 });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Use Google Places API (New) to get photo media
    // The API returns a redirect to the actual image
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;

    // Fetch the image (this will follow redirects)
    const response = await fetch(photoUrl, {
      redirect: "follow",
    });

    if (!response.ok) {
      // The stored Google photo resource name has likely expired. Flag the
      // school so the refresh cron re-fetches a fresh reference.
      if (schoolId) {
        await flagBrokenPhoto(schoolId);
      }
      return NextResponse.json(
        { error: "Failed to fetch photo" },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/jpeg";

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error fetching Google Places photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

