/**
 * Re-fetch a school's Google Places data (including fresh photo resource names)
 * and append the results as new PLACES-provenance facts. Shared by the admin
 * `seeds.refreshGooglePlaces` mutation and the scheduled photo-refresh cron.
 *
 * Each call makes one billable Place Details request, metered against the
 * monthly Places budget.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { photoHealth } from "@/db/schema/photo_health";
import { fetchPlaceById } from "@/lib/discovery/google";
import { meterPlacesUsage, placesBudgetRemaining } from "@/lib/places-budget";
import { normalizeGooglePlaces } from "@/lib/normalize-google-places";
import { FACT_KEYS } from "@/types";

const DEFAULT_PHOTO_REFRESH_BATCH = Number(
  process.env.PHOTO_REFRESH_BATCH ?? 50
);

export class RefreshError extends Error {
  constructor(
    message: string,
    public reason:
      | "NOT_FOUND"
      | "NO_PLACE_ID"
      | "PLACE_NOT_FOUND" = "NOT_FOUND"
  ) {
    super(message);
    this.name = "RefreshError";
  }
}

export interface RefreshResult {
  schoolId: string;
  updatedAt: Date;
}

/**
 * Refresh a single school from Google Places. Throws RefreshError for the
 * recoverable cases (school/place missing, no place id) so callers can decide
 * how to handle them.
 */
export async function refreshSchoolPlaces(
  schoolId: string
): Promise<RefreshResult> {
  const school = await db.query.schools.findFirst({
    where: (q, { eq }) => eq(q.id, schoolId),
  });
  if (!school) {
    throw new RefreshError("School not found", "NOT_FOUND");
  }

  // Resolve the Google Place ID from the school row or its latest fact.
  let googlePlaceId = school.googlePlaceId;
  if (!googlePlaceId) {
    const placeIdFact = await db.query.facts.findFirst({
      where: (q, { and, eq }) =>
        and(eq(q.schoolId, schoolId), eq(q.factKey, FACT_KEYS.GOOGLE_PLACE_ID)),
      orderBy: (facts, { desc }) => [desc(facts.asOf)],
    });
    if (placeIdFact && typeof placeIdFact.factValue === "string") {
      googlePlaceId = placeIdFact.factValue;
    }
  }
  if (!googlePlaceId) {
    throw new RefreshError("School does not have a Google Place ID", "NO_PLACE_ID");
  }

  // One billable Place Details call — meter it.
  await meterPlacesUsage();
  const candidate = await fetchPlaceById(googlePlaceId);
  if (!candidate) {
    throw new RefreshError("Place not found in Google Places", "PLACE_NOT_FOUND");
  }

  await db
    .update(schools)
    .set({
      lat: candidate.lat || null,
      lng: candidate.lng || null,
      googlePlaceId: candidate.placeId || null,
      phone: candidate.phone || school.phone || null,
      updatedAt: new Date(),
    })
    .where(eq(schools.id, schoolId));

  // Fall back to a scraped airport code if Google doesn't provide one.
  const latestSnapshot = await db.query.snapshots.findFirst({
    where: (q, { eq }) => eq(q.schoolId, schoolId),
    orderBy: (snapshots, { desc }) => [desc(snapshots.asOf)],
  });

  let scrapedAirportCode: string | null = null;
  if (latestSnapshot?.rawJson) {
    const rawJson = latestSnapshot.rawJson as Record<string, unknown>;
    if (Array.isArray(rawJson.locations) && rawJson.locations.length > 0) {
      const firstLocation = rawJson.locations[0] as Record<string, unknown>;
      if (
        typeof firstLocation.airportCode === "string" &&
        firstLocation.airportCode !== "USA"
      ) {
        scrapedAirportCode = firstLocation.airportCode;
      }
    }
    if (!scrapedAirportCode && typeof rawJson.location === "string") {
      const locationMatch = rawJson.location.match(/\b(K?[A-Z]{3,4})\b/);
      if (locationMatch && locationMatch[1] && locationMatch[1] !== "USA") {
        scrapedAirportCode = locationMatch[1];
      }
    }
  }

  const now = new Date();
  const refreshFacts = normalizeGooglePlaces({
    rating: candidate.rating ?? null,
    userRatingCount: candidate.userRatingCount ?? null,
    businessStatus: candidate.businessStatus || null,
    priceLevel: candidate.priceLevel || null,
    photos: candidate.photos || null,
    regularOpeningHours: candidate.regularOpeningHours || null,
    phone: candidate.phone || null,
    formattedAddress: candidate.address || null,
    addressComponents: candidate.addressComponents || null,
    location: { lat: candidate.lat, lng: candidate.lng },
    types: candidate.types || null,
    primaryType: candidate.primaryType || null,
    displayName: candidate.name || null,
    placeId: candidate.placeId || null,
  });

  const hasAirportCodeFact = refreshFacts.some(
    (f) => f.factKey === FACT_KEYS.LOCATION_AIRPORT_CODE
  );
  if (!hasAirportCodeFact && scrapedAirportCode) {
    refreshFacts.push({
      factKey: FACT_KEYS.LOCATION_AIRPORT_CODE,
      factValue: scrapedAirportCode,
    });
  }

  // Clean up invalid "USA" airport-code facts from previous extractions.
  await db
    .delete(facts)
    .where(
      and(
        eq(facts.schoolId, schoolId),
        eq(facts.factKey, FACT_KEYS.LOCATION_AIRPORT_CODE),
        eq(facts.factValue, "USA")
      )
    );

  if (refreshFacts.length > 0) {
    await db.insert(facts).values(
      refreshFacts.map((fact) => ({
        schoolId,
        factKey: fact.factKey,
        factValue: fact.factValue,
        provenance: "PLACES" as const,
        asOf: now,
      }))
    );
  }

  // Photos were just refreshed — clear any broken-image flag.
  await db.delete(photoHealth).where(eq(photoHealth.schoolId, schoolId));

  return { schoolId, updatedAt: now };
}

export interface BatchRefreshSummary {
  candidates: number;
  refreshed: number;
  failures: Array<{ schoolId: string; reason: string }>;
  budgetRemaining: number;
}

/**
 * Refresh a batch of stale-photo schools: broken-image schools first, then those
 * whose photos fact is oldest. Bounded by `batch` and the remaining monthly
 * Places budget, so it can never run up a bill. Shared by the cron route and the
 * admin "Refresh stale photos now" action.
 */
export async function refreshStalePhotosBatch(
  batch = DEFAULT_PHOTO_REFRESH_BATCH
): Promise<BatchRefreshSummary> {
  const budget = await placesBudgetRemaining();
  if (budget <= 0) {
    return { candidates: 0, refreshed: 0, failures: [], budgetRemaining: 0 };
  }

  const broken = await db
    .select({ schoolId: photoHealth.schoolId })
    .from(photoHealth)
    .where(eq(photoHealth.status, "broken"))
    .limit(batch);

  const oldest = await db
    .select({ schoolId: facts.schoolId })
    .from(facts)
    .where(eq(facts.factKey, FACT_KEYS.PHOTOS))
    .groupBy(facts.schoolId)
    .orderBy(asc(sql`max(${facts.asOf})`))
    .limit(batch);

  const limit = Math.min(batch, budget);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of [...broken, ...oldest]) {
    if (seen.has(row.schoolId)) continue;
    seen.add(row.schoolId);
    ids.push(row.schoolId);
    if (ids.length >= limit) break;
  }

  let refreshed = 0;
  const failures: BatchRefreshSummary["failures"] = [];
  for (const schoolId of ids) {
    try {
      await refreshSchoolPlaces(schoolId);
      refreshed++;
    } catch (error) {
      failures.push({
        schoolId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    candidates: ids.length,
    refreshed,
    failures,
    budgetRemaining: await placesBudgetRemaining(),
  };
}
