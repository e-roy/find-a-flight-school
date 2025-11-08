import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { batchEmbedSchools } from "@/lib/embeddings";
import { z } from "zod";

const EmbeddingsGenerateQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function POST(req: Request) {
  try {
    // Auth guard
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryData = EmbeddingsGenerateQuerySchema.parse({
      limit: searchParams.get("limit") ?? 20,
    });

    // Batch embed schools
    const results = await batchEmbedSchools(queryData.limit);

    return NextResponse.json(results);
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

