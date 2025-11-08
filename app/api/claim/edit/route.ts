import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claims } from "@/db/schema/claims";
import { facts } from "@/db/schema/facts";
import { ClaimEditSchema } from "@/lib/validation";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const data = ClaimEditSchema.parse(json);

    // Check if claim exists and is verified
    // For MVP, we'll use a token in the request body or check via schoolId
    // TODO(question): Should we use a separate claim token or session for edit access?
    const claim = await db
      .select()
      .from(claims)
      .where(
        and(
          eq(claims.schoolId, data.schoolId),
          eq(claims.status, "VERIFIED")
        )
      )
      .limit(1);

    if (claim.length === 0) {
      return NextResponse.json(
        { error: "No verified claim found for this school" },
        { status: 401 }
      );
    }

    const now = new Date();

    // Insert facts with CLAIM provenance and PENDING moderation status
    const factsToInsert = data.facts.map((fact) => ({
      schoolId: data.schoolId,
      factKey: fact.factKey,
      factValue: fact.factValue,
      provenance: "CLAIM" as const,
      moderationStatus: "PENDING" as const,
      asOf: now,
    }));

    await db.insert(facts).values(factsToInsert);

    return NextResponse.json({
      success: true,
      inserted: factsToInsert.length,
      message: "Facts submitted for moderation",
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

