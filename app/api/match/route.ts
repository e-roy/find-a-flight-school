import { NextResponse } from "next/server";
import { MatchRequestSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { schoolEmbeddings } from "@/db/schema/embeddings";
import {
  generateEmbedding,
  toEmbeddingText,
  getLatestFactsForSchool,
} from "@/lib/embeddings";
import { FACT_KEYS, PROGRAM_TYPES, COST_BANDS } from "@/types";
import { eq, and, inArray, sql } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { logEvent } from "@/lib/events";

interface MatchResult {
  school_id: string;
  score: number;
  reasons: string[];
}

/**
 * Calculate distance between two lat/lng points in kilometers (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate debrief reasons for a school using LLM
 */
async function generateDebrief(
  school: typeof schools.$inferSelect,
  latestFacts: Map<string, typeof facts.$inferSelect>,
  preferences: {
    aircraft?: string[];
    financingAvailable?: boolean;
  }
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return ["Debrief unavailable: OpenAI API key not configured"];
  }

  // Build context from facts
  const factContext: string[] = [];

  const programFacts = Array.from(latestFacts.values()).filter(
    (f) => f.factKey === FACT_KEYS.PROGRAM_TYPE
  );
  if (programFacts.length > 0) {
    const programs = programFacts
      .map((f) => f.factValue as string)
      .filter((p) => p !== null);
    factContext.push(`Programs offered: ${programs.join(", ")}`);
  }

  const costBandFact = latestFacts.get(FACT_KEYS.COST_BAND);
  if (costBandFact) {
    factContext.push(`Cost band: ${costBandFact.factValue as string}`);
  }

  const fleetFacts = Array.from(latestFacts.values()).filter(
    (f) => f.factKey === FACT_KEYS.FLEET_AIRCRAFT
  );
  if (fleetFacts.length > 0) {
    const aircraft = fleetFacts[0]!.factValue as string[];
    if (Array.isArray(aircraft) && aircraft.length > 0) {
      factContext.push(`Fleet: ${aircraft.join(", ")}`);
    }
  }

  const locationFact =
    latestFacts.get(FACT_KEYS.LOCATION_AIRPORT_CODE) ||
    latestFacts.get(FACT_KEYS.LOCATION_ADDRESS);
  if (locationFact) {
    factContext.push(`Location: ${locationFact.factValue as string}`);
  }

  const contextText = factContext.join(". ");

  // Build prompt
  const preferencesText = [
    preferences.aircraft?.length
      ? `Preferred aircraft: ${preferences.aircraft.join(", ")}`
      : null,
    preferences.financingAvailable ? `Financing: Required` : null,
  ]
    .filter(Boolean)
    .join(". ");

  const prompt = `Explain why this flight school matches the student's preferences. Only cite facts from the provided data. Do not invent information.

School: ${school.canonicalName}
Available facts: ${contextText}
Student preferences: ${preferencesText}

Provide exactly 3 concise reasons why this school is a good match. Each reason should be one sentence. Format as a JSON array of strings.`;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return ["Debrief unavailable: OpenAI API key not configured"];
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    // Try to parse as JSON array, fallback to splitting by newlines
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.every((r) => typeof r === "string")) {
        return parsed.slice(0, 3);
      }
    } catch {
      // Not JSON, try to extract reasons from text
    }

    // Fallback: split by newlines or periods and take first 3
    const reasons = text
      .split(/\n|\./)
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .slice(0, 3);

    return reasons.length > 0
      ? reasons
      : ["This school matches your preferences."];
  } catch (error) {
    console.error("Error generating debrief:", error);
    return ["Debrief generation failed"];
  }
}

export async function POST(req: Request) {
  try {
    // Parse request body
    const json = await req.json().catch(() => ({}));
    const input = MatchRequestSchema.parse(json);

    // Build query text from preferences
    const queryParts: string[] = [];
    if (input.aircraft && input.aircraft.length > 0) {
      queryParts.push(`Fleet: ${input.aircraft.join(", ")}`);
    }
    if (input.location) {
      queryParts.push(`Location: ${input.location.lat}, ${input.location.lng}`);
    } else if (input.city) {
      queryParts.push(`Location: ${input.city}`);
    }
    if (input.financingAvailable) {
      queryParts.push(`Financing: Available`);
    }

    const queryText =
      queryParts.length > 0 ? queryParts.join(". ") + "." : "Flight school";

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(queryText);

    // Collect school IDs that match filters
    let matchingSchoolIds: string[] | null = null;

    // Filter by financing if specified
    if (input.financingAvailable) {
      // Get latest snapshots per school and check for financingUrl or financingAvailable
      const financingSnapshotsQuery = sql`
        SELECT DISTINCT ON (school_id) school_id
        FROM snapshots
        WHERE (
          (raw_json->>'financingUrl' IS NOT NULL AND raw_json->>'financingUrl' != '' AND raw_json->>'financingUrl' != 'null')
          OR (raw_json->>'financingAvailable' = 'true')
          OR (raw_json->>'financing' = 'true')
        )
        ORDER BY school_id, as_of DESC
      `;

      const financingSnapshots = await db.execute(financingSnapshotsQuery);
      const schoolIds = (
        financingSnapshots.rows as Array<{ school_id: string }>
      ).map((r) => r.school_id);

      if (schoolIds.length > 0) {
        matchingSchoolIds = schoolIds;
      } else {
        // No schools have financing, return empty
        return NextResponse.json({ results: [] });
      }
    }

    // Get candidate schools (with embeddings)
    let candidateSchools: Array<{ id: string; lat?: number; lng?: number }> =
      [];

    if (matchingSchoolIds && matchingSchoolIds.length > 0) {
      // Filter to matching schools, capped at 50
      const filtered = await db
        .select({ id: schools.id, addrStd: schools.addrStd })
        .from(schools)
        .where(inArray(schools.id, matchingSchoolIds.slice(0, 50)));

      candidateSchools = filtered.map((s) => {
        let lat: number | undefined;
        let lng: number | undefined;
        if (
          s.addrStd &&
          typeof s.addrStd === "object" &&
          "lat" in s.addrStd &&
          "lng" in s.addrStd
        ) {
          lat = typeof s.addrStd.lat === "number" ? s.addrStd.lat : undefined;
          lng = typeof s.addrStd.lng === "number" ? s.addrStd.lng : undefined;
        }
        return { id: s.id, lat, lng };
      });
    } else {
      // No filters, get all schools with embeddings (capped at 50)
      const allSchools = await db
        .select({ id: schools.id, addrStd: schools.addrStd })
        .from(schools)
        .limit(50);

      candidateSchools = allSchools.map((s) => {
        let lat: number | undefined;
        let lng: number | undefined;
        if (
          s.addrStd &&
          typeof s.addrStd === "object" &&
          "lat" in s.addrStd &&
          "lng" in s.addrStd
        ) {
          lat = typeof s.addrStd.lat === "number" ? s.addrStd.lat : undefined;
          lng = typeof s.addrStd.lng === "number" ? s.addrStd.lng : undefined;
        }
        return { id: s.id, lat, lng };
      });
    }

    // Filter by location radius if specified
    if (input.location && candidateSchools.length > 0) {
      candidateSchools = candidateSchools.filter((school) => {
        if (school.lat === undefined || school.lng === undefined) {
          return false; // Skip schools without location
        }
        const distance = calculateDistance(
          input.location!.lat,
          input.location!.lng,
          school.lat,
          school.lng
        );
        return distance <= input.radiusKm;
      });
    }

    if (candidateSchools.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get embeddings for candidate schools and calculate cosine similarity
    const candidateIds = candidateSchools.map((s) => s.id);
    const embeddings = await db
      .select({
        schoolId: schoolEmbeddings.schoolId,
        embedding: schoolEmbeddings.embedding,
      })
      .from(schoolEmbeddings)
      .where(inArray(schoolEmbeddings.schoolId, candidateIds));

    // Note: embedding is stored as text (JSON string format) until pgvector migration

    // Convert query embedding to pgvector format
    const queryEmbeddingStr = `[${queryEmbedding.join(",")}]`;

    // Calculate cosine similarity for each school using raw SQL
    const scoredSchools: Array<{ schoolId: string; score: number }> = [];

    if (embeddings.length > 0) {
      // Calculate cosine similarity for each embedding
      for (const emb of embeddings) {
        // embedding is stored as text (vector format string like "[1,2,3]")
        const embeddingStr = emb.embedding as string;

        // Use raw SQL for cosine similarity
        // Cast text to vector for the calculation
        const result = await db.execute(
          sql`SELECT 1 - (${sql.raw(embeddingStr)}::vector <=> ${sql.raw(
            queryEmbeddingStr
          )}::vector) as similarity`
        );

        const similarity = result.rows[0]?.similarity as number | undefined;
        if (similarity !== undefined && !isNaN(similarity)) {
          scoredSchools.push({
            schoolId: emb.schoolId,
            score: similarity,
          });
        }
      }
    }

    // Sort by score descending
    scoredSchools.sort((a, b) => b.score - a.score);

    // Get top results (limit to reasonable number)
    const topResults = scoredSchools.slice(0, 10);

    // Get full school data and generate debrief for top 3
    const results: MatchResult[] = [];

    for (let i = 0; i < topResults.length; i++) {
      const scored = topResults[i]!;
      const school = await db.query.schools.findFirst({
        where: eq(schools.id, scored.schoolId),
      });

      if (!school) continue;

      const latestFacts = await getLatestFactsForSchool(scored.schoolId);

      // Generate debrief for top 3 only
      let reasons: string[] = [];
      if (i < 3) {
        reasons = await generateDebrief(school, latestFacts, {
          aircraft: input.aircraft,
          financingAvailable: input.financingAvailable,
        });
      }

      results.push({
        school_id: scored.schoolId,
        score: scored.score,
        reasons,
      });

      // Log match appearance event (non-blocking)
      logEvent("match_appearance", scored.schoolId).catch((err) => {
        console.error("Failed to log match appearance:", err);
      });
    }

    return NextResponse.json({ results });
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
