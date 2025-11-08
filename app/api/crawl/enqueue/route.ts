import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { CrawlEnqueueQuerySchema } from "@/lib/validation";
import { eq, and, isNotNull } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryData = CrawlEnqueueQuerySchema.parse({
      school_id: searchParams.get("school_id"),
    });

    // Validate school exists and has domain
    const school = await db
      .select()
      .from(schools)
      .where(and(eq(schools.id, queryData.school_id), isNotNull(schools.domain)))
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

    // Check if there's already a pending or processing job for this school
    const existingJob = await db
      .select()
      .from(crawlQueue)
      .where(
        and(
          eq(crawlQueue.schoolId, queryData.school_id),
          eq(crawlQueue.status, "pending")
        )
      )
      .limit(1);

    if (existingJob.length > 0) {
      return NextResponse.json({
        id: existingJob[0].id,
        message: "Job already enqueued",
        status: existingJob[0].status,
      });
    }

    // Create crawl queue entry
    const queueId = crypto.randomUUID();
    await db.insert(crawlQueue).values({
      id: queueId,
      schoolId: queryData.school_id,
      domain: schoolData.domain,
      status: "pending",
      attempts: 0,
      scheduledAt: new Date(),
    });

    return NextResponse.json({
      id: queueId,
      school_id: queryData.school_id,
      domain: schoolData.domain,
      status: "pending",
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

