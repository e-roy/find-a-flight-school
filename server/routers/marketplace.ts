import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { savedSchools, comparisons } from "@/db/schema";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { snapshots } from "@/db/schema/snapshots";
import { MatchRequestSchema } from "@/lib/validation";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { FACT_KEYS } from "@/types";

// Search input schema extends MatchRequestSchema with pagination
const SearchInputSchema = MatchRequestSchema.extend({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

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

// Helper to get latest facts for a school
async function getLatestFactsForSchool(
  db: typeof import("@/lib/db").db,
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
 * Filter schools based on input criteria
 * Returns array of school IDs that match all filters
 */
async function filterSchoolsByCriteria(
  db: typeof import("@/lib/db").db,
  input: {
    aircraft?: string[];
    city?: string;
    location?: { lat: number; lng: number };
    radiusKm?: number;
    financingAvailable?: boolean;
  }
): Promise<string[]> {
  let matchingSchoolIds: string[] | null = null;

  // Filter by financing if specified
  if (input.financingAvailable) {
    // Get latest snapshots per school and check for financingUrl or financingAvailable
    // Check for financingUrl (non-empty string) or financingAvailable/financing (true boolean)
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
      return [];
    }
  }

  // Filter by aircraft if specified
  if (input.aircraft && input.aircraft.length > 0) {
    const aircraftMatches = new Set<string>();

    // Search 1: Get latest APPROVED FLEET_AIRCRAFT facts per school
    const aircraftFactsQuery = sql`
      SELECT DISTINCT ON (school_id) school_id, fact_value
      FROM facts
      WHERE fact_key = ${FACT_KEYS.FLEET_AIRCRAFT}
        AND moderation_status = 'APPROVED'
      ORDER BY school_id, as_of DESC
    `;

    const allAircraftFacts = await db.execute(aircraftFactsQuery);

    // Search 2: Get latest snapshots per school and search rawJson->'fleet'
    const aircraftSnapshotsQuery = sql`
      SELECT DISTINCT ON (school_id) school_id, raw_json
      FROM snapshots
      WHERE raw_json->'fleet' IS NOT NULL
        AND jsonb_typeof(raw_json->'fleet') = 'array'
      ORDER BY school_id, as_of DESC
    `;

    const allAircraftSnapshots = await db.execute(aircraftSnapshotsQuery);

    // For each requested aircraft, check both facts and snapshots
    for (const requestedAircraft of input.aircraft) {
      const searchTerm = requestedAircraft.toLowerCase().trim();

      // Check facts
      for (const row of allAircraftFacts.rows as Array<{
        school_id: string;
        fact_value: unknown;
      }>) {
        // Parse fact_value - it might be a JSONB object that needs parsing
        let aircraftArray: unknown[] = [];

        if (Array.isArray(row.fact_value)) {
          aircraftArray = row.fact_value;
        } else if (typeof row.fact_value === "string") {
          // If it's a string, try to parse it as JSON
          try {
            const parsed = JSON.parse(row.fact_value);
            if (Array.isArray(parsed)) {
              aircraftArray = parsed;
            }
          } catch {
            // Not valid JSON, skip this fact
            continue;
          }
        } else {
          // Not an array or string, skip
          continue;
        }

        // Check if any aircraft in the array matches (case-insensitive partial match)
        const matches = aircraftArray.some((aircraft: unknown) => {
          if (typeof aircraft !== "string") {
            return false;
          }
          return aircraft.toLowerCase().includes(searchTerm);
        });

        if (matches) {
          aircraftMatches.add(row.school_id);
        }
      }

      // Check snapshots - search rawJson->'fleet' array directly
      for (const row of allAircraftSnapshots.rows as Array<{
        school_id: string;
        raw_json: unknown;
      }>) {
        if (!row.raw_json || typeof row.raw_json !== "object") {
          continue;
        }

        const snapshotData = row.raw_json as Record<string, unknown>;
        const fleet = snapshotData.fleet;

        if (!Array.isArray(fleet)) {
          continue;
        }

        // Check if any fleet item contains the search term (case-insensitive)
        const matches = fleet.some((fleetItem: unknown) => {
          if (typeof fleetItem !== "string") {
            return false;
          }
          return fleetItem.toLowerCase().includes(searchTerm);
        });

        if (matches) {
          aircraftMatches.add(row.school_id);
        }
      }
    }

    if (aircraftMatches.size > 0) {
      if (matchingSchoolIds) {
        // Intersect with existing filters
        const existingSet = new Set(matchingSchoolIds);
        matchingSchoolIds = Array.from(aircraftMatches).filter((id) =>
          existingSet.has(id)
        );
        if (matchingSchoolIds.length === 0) {
          return [];
        }
      } else {
        matchingSchoolIds = Array.from(aircraftMatches);
      }
    } else {
      return [];
    }
  }

  // If no fact-based filters, get all school IDs
  if (!matchingSchoolIds) {
    const allSchools = await db.select({ id: schools.id }).from(schools);
    matchingSchoolIds = allSchools.map((s) => s.id);
  }

  // Apply city filter if specified (simple text match on addrStd)
  if (input.city) {
    const allSchools = await db
      .select({ id: schools.id, addrStd: schools.addrStd })
      .from(schools)
      .where(inArray(schools.id, matchingSchoolIds));

    const cityFiltered = allSchools.filter((school) => {
      if (!school.addrStd || typeof school.addrStd !== "object") {
        return false;
      }
      const addr = school.addrStd as Record<string, unknown>;
      const city = addr.city;
      return (
        typeof city === "string" &&
        city.toLowerCase().includes(input.city!.toLowerCase())
      );
    });

    matchingSchoolIds = cityFiltered.map((s) => s.id);
    if (matchingSchoolIds.length === 0) {
      return [];
    }
  }

  // Apply location/radius filter if specified
  if (input.location && matchingSchoolIds.length > 0) {
    const allSchools = await db
      .select({ id: schools.id, addrStd: schools.addrStd })
      .from(schools)
      .where(inArray(schools.id, matchingSchoolIds));

    const radiusKm = input.radiusKm ?? 100;
    const locationFiltered = allSchools.filter((school) => {
      if (!school.addrStd || typeof school.addrStd !== "object") {
        return false;
      }
      const addr = school.addrStd as Record<string, unknown>;
      const lat = addr.lat;
      const lng = addr.lng;

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      ) {
        return false;
      }

      const distance = calculateDistance(
        input.location!.lat,
        input.location!.lng,
        lat,
        lng
      );
      return distance <= radiusKm;
    });

    matchingSchoolIds = locationFiltered.map((s) => s.id);
  }

  return matchingSchoolIds;
}

export const marketplaceRouter = router({
  search: router({
    query: publicProcedure
      .input(SearchInputSchema.optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        try {
          // Get matching school IDs based on filters
          const matchingSchoolIds = await filterSchoolsByCriteria(ctx.db, {
            aircraft: input?.aircraft,
            city: input?.city,
            location: input?.location,
            radiusKm: input?.radiusKm,
            financingAvailable: input?.financingAvailable,
          });

          if (matchingSchoolIds.length === 0) {
            return [];
          }

          // Fetch schools that match the filters using standard query builder
          const filteredSchools = await ctx.db
            .select()
            .from(schools)
            .where(inArray(schools.id, matchingSchoolIds))
            .orderBy(desc(schools.createdAt));

          // Apply pagination
          const paginatedSchools = filteredSchools.slice(
            offset,
            offset + limit
          );

          // Fetch latest facts and snapshots for each school
          const schoolsWithFacts = await Promise.all(
            paginatedSchools.map(async (school) => {
              const latestFacts = await getLatestFactsForSchool(
                ctx.db,
                school.id
              );

              // Get latest snapshot for financing info
              const latestSnapshot = await ctx.db.query.snapshots.findFirst({
                where: (q, { eq }) => eq(q.schoolId, school.id),
                orderBy: (snapshots, { desc }) => [desc(snapshots.asOf)],
              });

              // Extract financing URL from snapshot
              let financingAvailable = false;
              if (latestSnapshot?.rawJson) {
                const snapshotData = latestSnapshot.rawJson as Record<
                  string,
                  unknown
                >;
                const financingUrl = snapshotData.financingUrl;
                financingAvailable =
                  typeof financingUrl === "string" && financingUrl.length > 0;
              }

              // Extract key facts for card display
              const programs = Array.from(latestFacts.values())
                .filter((f) => f.factKey === FACT_KEYS.PROGRAM_TYPE)
                .map((f) => f.factValue)
                .filter(
                  (v): v is string => typeof v === "string" && v.length > 0
                );

              const costBand = latestFacts.get(FACT_KEYS.COST_BAND)?.factValue;
              const fleetAircraft = latestFacts.get(
                FACT_KEYS.FLEET_AIRCRAFT
              )?.factValue;
              const rating = latestFacts.get(FACT_KEYS.RATING)?.factValue;
              const ratingCount = latestFacts.get(
                FACT_KEYS.RATING_COUNT
              )?.factValue;
              const photos = latestFacts.get(FACT_KEYS.PHOTOS)?.factValue;

              return {
                ...school,
                facts: {
                  programs,
                  costBand: typeof costBand === "string" ? costBand : undefined,
                  fleetAircraft: Array.isArray(fleetAircraft)
                    ? fleetAircraft
                    : undefined,
                  rating: typeof rating === "number" ? rating : undefined,
                  ratingCount:
                    typeof ratingCount === "number" ? ratingCount : undefined,
                  photos: Array.isArray(photos) ? photos : undefined,
                  financingAvailable,
                },
              };
            })
          );

          return schoolsWithFacts;
        } catch (error) {
          // Fallback to standard query builder if relational API fails
          console.error(
            "Relational query failed, using standard builder:",
            error
          );
          const { db } = await import("@/lib/db");

          // Get matching school IDs based on filters
          const matchingSchoolIds = await filterSchoolsByCriteria(db, {
            aircraft: input?.aircraft,
            city: input?.city,
            location: input?.location,
            radiusKm: input?.radiusKm,
            financingAvailable: input?.financingAvailable,
          });

          if (matchingSchoolIds.length === 0) {
            return [];
          }

          // Fetch schools that match the filters
          const filteredSchools = await db
            .select()
            .from(schools)
            .where(inArray(schools.id, matchingSchoolIds))
            .orderBy(desc(schools.createdAt));

          // Apply pagination
          const paginatedSchools = filteredSchools.slice(
            offset,
            offset + limit
          );

          // Fetch latest facts and snapshots for each school
          const schoolsWithFacts = await Promise.all(
            paginatedSchools.map(async (school) => {
              const latestFacts = await getLatestFactsForSchool(db, school.id);

              // Get latest snapshot for financing info
              const latestSnapshot = await db.query.snapshots.findFirst({
                where: (q, { eq }) => eq(q.schoolId, school.id),
                orderBy: (snapshots, { desc }) => [desc(snapshots.asOf)],
              });

              // Extract financing URL from snapshot
              let financingAvailable = false;
              if (latestSnapshot?.rawJson) {
                const snapshotData = latestSnapshot.rawJson as Record<
                  string,
                  unknown
                >;
                const financingUrl = snapshotData.financingUrl;
                financingAvailable =
                  typeof financingUrl === "string" && financingUrl.length > 0;
              }

              // Extract key facts for card display
              const programs = Array.from(latestFacts.values())
                .filter((f) => f.factKey === FACT_KEYS.PROGRAM_TYPE)
                .map((f) => f.factValue)
                .filter(
                  (v): v is string => typeof v === "string" && v.length > 0
                );

              const costBand = latestFacts.get(FACT_KEYS.COST_BAND)?.factValue;
              const fleetAircraft = latestFacts.get(
                FACT_KEYS.FLEET_AIRCRAFT
              )?.factValue;
              const rating = latestFacts.get(FACT_KEYS.RATING)?.factValue;
              const ratingCount = latestFacts.get(
                FACT_KEYS.RATING_COUNT
              )?.factValue;
              const photos = latestFacts.get(FACT_KEYS.PHOTOS)?.factValue;

              return {
                ...school,
                facts: {
                  programs,
                  costBand: typeof costBand === "string" ? costBand : undefined,
                  fleetAircraft: Array.isArray(fleetAircraft)
                    ? fleetAircraft
                    : undefined,
                  rating: typeof rating === "number" ? rating : undefined,
                  ratingCount:
                    typeof ratingCount === "number" ? ratingCount : undefined,
                  photos: Array.isArray(photos) ? photos : undefined,
                  financingAvailable,
                },
              };
            })
          );

          return schoolsWithFacts;
        }
      }),
  }),

  saved: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const userId = ctx.session.user.id;

      const saved = await ctx.db.query.savedSchools.findMany({
        where: (q, { eq }) => eq(q.userId, userId),
      });

      return saved.map((s) => s.schoolId);
    }),

    toggle: protectedProcedure
      .input(z.object({ schoolId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const userId = ctx.session.user.id;

        // Check if already saved
        const existing = await ctx.db
          .select()
          .from(savedSchools)
          .where(
            and(
              eq(savedSchools.userId, userId),
              eq(savedSchools.schoolId, input.schoolId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Delete (unsave)
          await ctx.db
            .delete(savedSchools)
            .where(
              and(
                eq(savedSchools.userId, userId),
                eq(savedSchools.schoolId, input.schoolId)
              )
            );
          return { saved: false };
        } else {
          // Insert (save)
          await ctx.db.insert(savedSchools).values({
            userId,
            schoolId: input.schoolId,
          });
          return { saved: true };
        }
      }),
  }),

  compare: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const userId = ctx.session.user.id;

      // Get most recent comparison for user
      const comparison = await ctx.db
        .select()
        .from(comparisons)
        .where(eq(comparisons.userId, userId))
        .orderBy(desc(comparisons.createdAt))
        .limit(1);

      if (comparison.length === 0) {
        return null;
      }

      return { schoolIds: comparison[0]!.schoolIds };
    }),

    set: protectedProcedure
      .input(
        z.object({
          schoolIds: z
            .array(z.string().uuid())
            .min(1)
            .max(4, "Maximum 4 schools can be compared"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const userId = ctx.session.user.id;

        // Check if comparison exists for user
        const existing = await ctx.db
          .select()
          .from(comparisons)
          .where(eq(comparisons.userId, userId))
          .orderBy(desc(comparisons.createdAt))
          .limit(1);

        if (existing.length > 0) {
          // Update existing comparison
          await ctx.db
            .update(comparisons)
            .set({
              schoolIds: input.schoolIds,
            })
            .where(eq(comparisons.id, existing[0]!.id));
        } else {
          // Insert new comparison
          await ctx.db.insert(comparisons).values({
            id: crypto.randomUUID(),
            userId,
            schoolIds: input.schoolIds,
          });
        }

        return { schoolIds: input.schoolIds };
      }),
  }),
});
