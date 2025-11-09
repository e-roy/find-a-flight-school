import { NextResponse } from "next/server";
import { CrawlWorkerQuerySchema } from "@/lib/validation";
import { processCrawlQueue } from "@/lib/crawl-worker";

export async function POST(req: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryData = CrawlWorkerQuerySchema.parse({
      limit: searchParams.get("limit") ?? 20,
    });

    const results = await processCrawlQueue(queryData.limit);

    return NextResponse.json(results);
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
