import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { claims } from "@/db/schema/claims";
import { ClaimRequestSchema } from "@/lib/validation";
import { sendVerificationEmail } from "@/lib/email";
import { eq, and, isNotNull } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const data = ClaimRequestSchema.parse(json);

    // Check if school exists and has domain
    const school = await db
      .select()
      .from(schools)
      .where(and(eq(schools.id, data.schoolId), isNotNull(schools.domain)))
      .limit(1);

    if (school.length === 0) {
      return NextResponse.json(
        { error: "School not found or does not have a domain" },
        { status: 404 }
      );
    }

    const schoolData = school[0];
    if (!schoolData.domain) {
      return NextResponse.json(
        { error: "School does not have a domain" },
        { status: 400 }
      );
    }

    // Validate email domain matches school domain
    const emailDomain = data.email.split("@")[1]?.toLowerCase();
    const schoolDomain = schoolData.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");

    if (emailDomain !== schoolDomain) {
      return NextResponse.json(
        { error: "Email domain must match school domain" },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = randomBytes(16).toString("hex");

    // Check if claim already exists for this school
    const existingClaim = await db
      .select()
      .from(claims)
      .where(eq(claims.schoolId, data.schoolId))
      .limit(1);

    if (existingClaim.length > 0) {
      // Update existing claim
      await db
        .update(claims)
        .set({
          email: data.email,
          token,
          status: "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(claims.id, existingClaim[0].id));
    } else {
      // Create new claim
      const claimId = crypto.randomUUID();
      await db.insert(claims).values({
        id: claimId,
        schoolId: data.schoolId,
        email: data.email,
        token,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Send verification email
    try {
      await sendVerificationEmail(data.email, token, schoolData.canonicalName);
    } catch (emailError) {
      // Log error but don't fail the request
      console.error("Failed to send verification email:", emailError);
      // TODO(question): Should we fail the request if email fails, or just log it?
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
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

