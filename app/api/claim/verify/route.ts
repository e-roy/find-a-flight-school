import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claims } from "@/db/schema/claims";
import { ClaimVerifySchema } from "@/lib/validation";
import { eq, and } from "drizzle-orm";

const TOKEN_EXPIRY_HOURS = 24;

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const data = ClaimVerifySchema.parse(json);

    // Find claim by token
    const claim = await db
      .select()
      .from(claims)
      .where(eq(claims.token, data.token))
      .limit(1);

    if (claim.length === 0) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    const claimData = claim[0];

    // Check if token is expired (24 hours)
    const now = new Date();
    const createdAt = claimData.createdAt;
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > TOKEN_EXPIRY_HOURS) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      );
    }

    // Check if status is PENDING
    if (claimData.status !== "PENDING") {
      return NextResponse.json(
        { error: "Claim has already been verified" },
        { status: 400 }
      );
    }

    // Update claim status to VERIFIED
    await db
      .update(claims)
      .set({
        status: "VERIFIED",
        updatedAt: new Date(),
      })
      .where(eq(claims.id, claimData.id));

    return NextResponse.json({
      success: true,
      schoolId: claimData.schoolId,
      email: claimData.email,
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

