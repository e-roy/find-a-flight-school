import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const { schoolId } = json;

    if (!schoolId || typeof schoolId !== "string") {
      return NextResponse.json(
        { error: "Invalid schoolId" },
        { status: 400 }
      );
    }

    // Log the profile view event (non-blocking)
    await logEvent("profile_view", schoolId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Don't fail the request if event logging fails
    console.error("Failed to log view event:", error);
    return NextResponse.json({ ok: true });
  }
}

