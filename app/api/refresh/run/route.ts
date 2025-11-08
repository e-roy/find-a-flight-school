import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { RefreshRunQuerySchema } from "@/lib/validation";
import { enqueueStaleSchools } from "@/lib/refresh";

export async function POST(req: Request) {
  try {
    // Auth guard - allow Vercel cron jobs via header or authenticated users
    const cronHeader = req.headers.get("x-vercel-cron");
    const isCronJob = cronHeader === "1";
    
    if (!isCronJob) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryData = RefreshRunQuerySchema.parse({
      limit: searchParams.get("limit") ?? 50,
    });

    // Enqueue stale schools
    const results = await enqueueStaleSchools(queryData.limit);

    return NextResponse.json({
      ok: true,
      enqueued: results.enqueued,
      skipped: results.skipped,
      errors: results.errors,
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

