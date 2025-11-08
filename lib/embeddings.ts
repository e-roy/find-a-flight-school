/**
 * Embeddings utilities: generate embeddings from school facts and manage vector storage
 */

import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { schoolEmbeddings } from "@/db/schema/embeddings";
import { FACT_KEYS } from "@/types";
import { eq, desc, sql } from "drizzle-orm";
import type { FactValue } from "@/types";

interface SchoolWithFacts {
  school: typeof schools.$inferSelect;
  latestFacts: Map<string, typeof facts.$inferSelect>;
}

/**
 * Get latest facts for a school, grouped by fact key
 */
export async function getLatestFactsForSchool(
  schoolId: string
): Promise<Map<string, typeof facts.$inferSelect>> {
  const allFacts = await db.query.facts.findMany({
    where: eq(facts.schoolId, schoolId),
    orderBy: [desc(facts.asOf)],
  });

  // Group by fact_key and keep only the latest (first) fact per key
  const latestFactsByKey = new Map<string, typeof facts.$inferSelect>();
  for (const fact of allFacts) {
    if (!latestFactsByKey.has(fact.factKey)) {
      latestFactsByKey.set(fact.factKey, fact);
    }
  }

  return latestFactsByKey;
}

/**
 * Build embedding text from school and facts
 * Format: "Flight school: [name]. Programs: PPL, IR. Fleet: Cessna 172, Piper PA-28. Location: KORD. Cost: LOW."
 */
export function toEmbeddingText(
  school: typeof schools.$inferSelect,
  latestFacts: Map<string, typeof facts.$inferSelect>
): string {
  const parts: string[] = [];

  // School name
  parts.push(`Flight school: ${school.canonicalName}`);

  // Programs
  const programFacts = Array.from(latestFacts.values()).filter(
    (f) => f.factKey === FACT_KEYS.PROGRAM_TYPE
  );
  if (programFacts.length > 0) {
    const programs = programFacts
      .map((f) => {
        const value = f.factValue as FactValue;
        return typeof value === "string" ? value : null;
      })
      .filter((p): p is string => p !== null);
    if (programs.length > 0) {
      parts.push(`Programs: ${programs.join(", ")}`);
    }
  }

  // Fleet aircraft
  const fleetFacts = Array.from(latestFacts.values()).filter(
    (f) => f.factKey === FACT_KEYS.FLEET_AIRCRAFT
  );
  if (fleetFacts.length > 0) {
    const latestFleetFact = fleetFacts[0];
    const aircraft = latestFleetFact.factValue as FactValue;
    if (Array.isArray(aircraft) && aircraft.length > 0) {
      parts.push(`Fleet: ${aircraft.join(", ")}`);
    }
  }

  // Location
  const airportCodeFact = latestFacts.get(FACT_KEYS.LOCATION_AIRPORT_CODE);
  const addressFact = latestFacts.get(FACT_KEYS.LOCATION_ADDRESS);
  if (airportCodeFact) {
    const code = airportCodeFact.factValue as FactValue;
    if (typeof code === "string") {
      parts.push(`Location: ${code}`);
    }
  } else if (addressFact) {
    const address = addressFact.factValue as FactValue;
    if (typeof address === "string") {
      parts.push(`Location: ${address}`);
    }
  }

  // Cost band
  const costBandFact = latestFacts.get(FACT_KEYS.COST_BAND);
  if (costBandFact) {
    const band = costBandFact.factValue as FactValue;
    if (typeof band === "string") {
      parts.push(`Cost: ${band}`);
    }
  }

  return parts.join(". ") + ".";
}

/**
 * Generate embedding vector from text using OpenAI API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error("Invalid response from OpenAI API");
  }

  return data.data[0].embedding as number[];
}

/**
 * Upsert embedding for a school
 */
export async function upsertSchoolEmbedding(
  schoolId: string,
  embedding: number[]
): Promise<void> {
  // Convert number[] to the format expected by customType
  const embeddingValue: { data: number[]; driverData: string } = {
    data: embedding,
    driverData: `[${embedding.join(",")}]`,
  };

  await db
    .insert(schoolEmbeddings)
    .values({
      schoolId,
      embedding: embeddingValue,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schoolEmbeddings.schoolId,
      set: {
        embedding: embeddingValue,
        updatedAt: new Date(),
      },
    });
}

/**
 * Batch embed schools (processes schools in batches)
 */
export async function batchEmbedSchools(
  limit: number = 20
): Promise<{ processed: number; embedded: number; errors: Array<{ schoolId: string; error: string }> }> {
  const results = {
    processed: 0,
    embedded: 0,
    errors: [] as Array<{ schoolId: string; error: string }>,
  };

  // Get schools without embeddings or with stale embeddings
  const allSchools = await db.query.schools.findMany({
    limit: limit * 2, // Get more to account for schools that already have embeddings
  });

  // Filter to schools that need embeddings
  const schoolsNeedingEmbeddings: typeof allSchools = [];
  for (const school of allSchools) {
    if (schoolsNeedingEmbeddings.length >= limit) break;

    // Check if school has embedding
    const existing = await db.query.schoolEmbeddings.findFirst({
      where: eq(schoolEmbeddings.schoolId, school.id),
    });

    // Skip if already has embedding (can add staleness check later)
    if (!existing) {
      schoolsNeedingEmbeddings.push(school);
    }
  }

  // Process each school
  for (const school of schoolsNeedingEmbeddings) {
    results.processed++;

    try {
      // Get latest facts
      const latestFacts = await getLatestFactsForSchool(school.id);

      // Skip if no facts
      if (latestFacts.size === 0) {
        continue;
      }

      // Build embedding text
      const embeddingText = toEmbeddingText(school, latestFacts);

      // Generate embedding
      const embedding = await generateEmbedding(embeddingText);

      // Upsert embedding
      await upsertSchoolEmbedding(school.id, embedding);

      results.embedded++;
    } catch (error) {
      results.errors.push({
        schoolId: school.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

