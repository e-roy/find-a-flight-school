import { NextResponse } from "next/server";
import { runDeduplication } from "@/lib/dedupe";
// TODO(question): Should we implement auth check here? Currently auth.ts doesn't exist
// import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // TODO: Add auth check when auth.ts is implemented
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Run deduplication
    const result = await runDeduplication();

    return NextResponse.json({
      merged: result.merged,
      promoted: result.promoted,
      errors: result.errors,
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
