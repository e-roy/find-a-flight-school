import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { eventsFinancing } from "@/db/schema/events_financing";
import { FinancingIntentSchema } from "@/lib/validation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const data = FinancingIntentSchema.parse(json);

    // Verify school exists
    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.id, data.schoolId))
      .limit(1);

    if (school.length === 0) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Generate session identifier (UUID)
    const userSessionId = randomUUID();

    // Insert financing intent event
    const eventId = randomUUID();
    await db.insert(eventsFinancing).values({
      id: eventId,
      schoolId: data.schoolId,
      userSessionId,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

