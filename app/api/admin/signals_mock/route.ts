import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signalsMock } from "@/db/schema/signals_mock";
import {
  SignalsMockCreateSchema,
  SignalsMockUpdateSchema,
  SignalsMockListQuerySchema,
} from "@/lib/validation";
import { eq } from "drizzle-orm";

// POST: Create or update signals (upsert by school_id)
export async function POST(req: Request) {
  try {
    // Auth guard
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const data = SignalsMockCreateSchema.parse(json);

    const now = new Date();

    // Upsert: try to update first, if no rows affected, insert
    const existing = await db
      .select()
      .from(signalsMock)
      .where(eq(signalsMock.schoolId, data.schoolId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(signalsMock)
        .set({
          trainingVelocity: data.trainingVelocity ?? existing[0]!.trainingVelocity,
          scheduleReliability:
            data.scheduleReliability ?? existing[0]!.scheduleReliability,
          safetyNotes: data.safetyNotes ?? existing[0]!.safetyNotes,
          updatedAt: now,
        })
        .where(eq(signalsMock.schoolId, data.schoolId));

      return NextResponse.json({
        success: true,
        message: "Signals updated",
      });
    } else {
      // Insert new
      await db.insert(signalsMock).values({
        schoolId: data.schoolId,
        trainingVelocity: data.trainingVelocity ?? null,
        scheduleReliability: data.scheduleReliability ?? null,
        safetyNotes: data.safetyNotes ?? null,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        message: "Signals created",
      });
    }
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

// GET: List all signals (with pagination)
export async function GET(req: Request) {
  try {
    // Auth guard
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queryData = SignalsMockListQuerySchema.parse({
      limit: searchParams.get("limit") ?? 50,
      offset: searchParams.get("offset") ?? 0,
    });

    const allSignals = await db.select().from(signalsMock);

    // Manual pagination
    const paginatedSignals = allSignals.slice(
      queryData.offset,
      queryData.offset + queryData.limit
    );

    return NextResponse.json({
      signals: paginatedSignals,
      total: allSignals.length,
      limit: queryData.limit,
      offset: queryData.offset,
    });
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

// PATCH: Update specific signal fields
export async function PATCH(req: Request) {
  try {
    // Auth guard
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const data = SignalsMockUpdateSchema.parse(json);

    // Check if signal exists
    const existing = await db
      .select()
      .from(signalsMock)
      .where(eq(signalsMock.schoolId, data.schoolId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Signals not found for this school" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: {
      trainingVelocity?: number | null;
      scheduleReliability?: number | null;
      safetyNotes?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (data.trainingVelocity !== undefined) {
      updateData.trainingVelocity = data.trainingVelocity;
    }
    if (data.scheduleReliability !== undefined) {
      updateData.scheduleReliability = data.scheduleReliability;
    }
    if (data.safetyNotes !== undefined) {
      updateData.safetyNotes = data.safetyNotes;
    }

    await db
      .update(signalsMock)
      .set(updateData)
      .where(eq(signalsMock.schoolId, data.schoolId));

    return NextResponse.json({
      success: true,
      message: "Signals updated",
    });
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

// DELETE: Remove signals for a school
export async function DELETE(req: Request) {
  try {
    // Auth guard
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json(
        { error: "schoolId query parameter is required" },
        { status: 400 }
      );
    }

    // Check if signal exists
    const existing = await db
      .select()
      .from(signalsMock)
      .where(eq(signalsMock.schoolId, schoolId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Signals not found for this school" },
        { status: 404 }
      );
    }

    await db.delete(signalsMock).where(eq(signalsMock.schoolId, schoolId));

    return NextResponse.json({
      success: true,
      message: "Signals deleted",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

