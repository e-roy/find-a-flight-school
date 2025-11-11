import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { schools } from "@/db/schema/schools";
import { sources } from "@/db/schema/sources";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { facts } from "@/db/schema/facts";
import { or, ilike, eq, and, isNotNull } from "drizzle-orm";
import { hasRole } from "@/lib/rbac";
import { search, fetchPlaceById } from "@/lib/discovery/google";
import { checkDiscoverQuota, checkImportQuota } from "@/lib/quota";
import { normalizeGooglePlaces } from "@/lib/normalize-google-places";
import { FACT_KEYS } from "@/types";

/**
 * Middleware to check if user has admin role
 */
const isAdmin = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userIsAdmin = hasRole(ctx.session, "admin");
  if (!userIsAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin role required",
    });
  }

  return next();
});

/**
 * Extract domain from website URL or return as-is if already a domain
 */
function extractDomain(website: string | null): string | null {
  if (!website) return null;

  try {
    // If it's already a domain (no protocol), return as-is
    if (!website.includes("://")) {
      // Remove www. prefix and trailing slashes
      return (
        website
          .replace(/^www\./i, "")
          .replace(/\/+$/, "")
          .toLowerCase() || null
      );
    }

    // Parse URL and extract hostname
    const url = new URL(website);
    let hostname = url.hostname;

    // Remove www. prefix
    hostname = hostname.replace(/^www\./i, "");

    return hostname.toLowerCase() || null;
  } catch {
    // If URL parsing fails, try to extract domain-like string
    const match = website.match(
      /(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i
    );
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    return null;
  }
}

/**
 * Normalize address into standard format
 */
function normalizeAddress(
  city: string | null,
  state: string | null,
  country: string | null,
  streetAddress?: string | null,
  postalCode?: string | null
): {
  city: string;
  state: string | null;
  country: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
} | null {
  if (!city) return null;

  return {
    city: city.trim(),
    state: state?.trim() || null,
    country: country?.trim() || null,
    streetAddress: streetAddress?.trim() || null,
    postalCode: postalCode?.trim() || null,
  };
}

/**
 * Create school from Google Places data
 * Handles school creation, source record, facts, and crawl enqueue
 */
async function createSchoolFromGooglePlaces(
  db: Awaited<
    ReturnType<typeof import("@/lib/trpc/context").createContext>
  >["db"],
  input: {
    name: string;
    website?: string | null;
    phone?: string | null;
    placeId?: string | null;
    rating?: number | null;
    userRatingCount?: number | null;
    businessStatus?: string | null;
    priceLevel?: string | null;
    photos?: any;
    regularOpeningHours?: any;
    currentOpeningHours?: any;
    formattedAddress?: string | null;
    addressComponents?: any[] | null;
    location?: { lat: number; lng: number } | null;
    types?: string[] | null;
    primaryType?: string | null;
  },
  addressData: {
    city: string | null;
    state: string | null;
    country: string | null;
    streetAddress: string | null;
    postalCode: string | null;
  },
  collectedAt: Date
): Promise<{ schoolId: string; queueId: string | null; isNew: boolean }> {
  // Normalize domain from website
  const normalizeDomain = (
    website: string | undefined | null
  ): string | null => {
    if (!website) return null;
    try {
      if (!website.includes("://")) {
        return (
          website
            .replace(/^www\./i, "")
            .replace(/\/+$/, "")
            .toLowerCase() || null
        );
      }
      const url = new URL(website);
      return url.hostname.replace(/^www\./i, "").toLowerCase() || null;
    } catch {
      const match = website.match(
        /(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i
      );
      return match?.[1]?.toLowerCase() || null;
    }
  };

  const domain = normalizeDomain(input.website);

  // Check for existing school by domain (dedupe check)
  let schoolId: string;
  let queueId: string | null = null;
  let isNew = false;

  if (domain) {
    const existingSchool = await db
      .select()
      .from(schools)
      .where(eq(schools.domain, domain))
      .limit(1);

    if (existingSchool.length > 0) {
      // School already exists, just create source record
      // Skip facts creation to prevent duplicates
      schoolId = existingSchool[0].id;
      const sourceId = crypto.randomUUID();
      const addrStd = normalizeAddress(
        addressData.city,
        addressData.state,
        addressData.country,
        addressData.streetAddress,
        addressData.postalCode
      );

      await db.insert(sources).values({
        id: sourceId,
        schoolId,
        sourceType: "PLACES",
        sourceRef: input.placeId || null,
        observedDomain: domain,
        observedName: input.name,
        observedPhone: input.phone || null,
        observedAddr: addrStd,
        collectedAt,
      });

      // Return early - no facts or crawl enqueue for existing schools
      return { schoolId, queueId: null, isNew: false };
    } else {
      // Create new school
      isNew = true;
      schoolId = crypto.randomUUID();
      const addrStd = normalizeAddress(
        addressData.city,
        addressData.state,
        addressData.country,
        addressData.streetAddress,
        addressData.postalCode
      );

      await db.insert(schools).values({
        id: schoolId,
        canonicalName: input.name,
        addrStd,
        phone: input.phone || null,
        domain,
        lat: input.location?.lat || null,
        lng: input.location?.lng || null,
        googlePlaceId: input.placeId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create source record for lineage
      const sourceId = crypto.randomUUID();
      await db.insert(sources).values({
        id: sourceId,
        schoolId,
        sourceType: "PLACES",
        sourceRef: input.placeId || null,
        observedDomain: domain,
        observedName: input.name,
        observedPhone: input.phone || null,
        observedAddr: addrStd,
        collectedAt,
      });

      // Enqueue crawl (check for existing pending job first)
      const existingJob = await db
        .select()
        .from(crawlQueue)
        .where(
          and(
            eq(crawlQueue.schoolId, schoolId),
            eq(crawlQueue.status, "pending")
          )
        )
        .limit(1);

      if (existingJob.length === 0 && domain) {
        queueId = crypto.randomUUID();
        await db.insert(crawlQueue).values({
          id: queueId,
          schoolId,
          domain,
          status: "pending",
          attempts: 0,
          scheduledAt: new Date(),
        });
      } else if (existingJob.length > 0) {
        queueId = existingJob[0].id;
      }
    }
  } else {
    // No domain, create school anyway (may not have website)
    isNew = true;
    schoolId = crypto.randomUUID();
    const addrStd = normalizeAddress(
      addressData.city,
      addressData.state,
      addressData.country,
      addressData.streetAddress,
      addressData.postalCode
    );

    await db.insert(schools).values({
      id: schoolId,
      canonicalName: input.name,
      addrStd,
      phone: input.phone || null,
      domain: null,
      lat: input.location?.lat || null,
      lng: input.location?.lng || null,
      googlePlaceId: input.placeId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create source record for lineage
    const sourceId = crypto.randomUUID();
    await db.insert(sources).values({
      id: sourceId,
      schoolId,
      sourceType: "PLACES",
      sourceRef: input.placeId || null,
      observedDomain: null,
      observedName: input.name,
      observedPhone: input.phone || null,
      observedAddr: addrStd,
      collectedAt,
    });
  }

  // Create facts from Google Places data (only for new schools)
  const seedFacts = normalizeGooglePlaces({
    rating: input.rating ?? null,
    userRatingCount: input.userRatingCount ?? null,
    businessStatus: input.businessStatus || null,
    priceLevel: input.priceLevel || null,
    photos: input.photos || null,
    regularOpeningHours: input.regularOpeningHours || null,
    phone: input.phone || null,
    formattedAddress: input.formattedAddress || null,
    addressComponents: input.addressComponents || null,
    location: input.location || null,
    types: input.types || null,
    primaryType: input.primaryType || null,
    placeId: input.placeId || null,
    displayName: input.name || null,
  });
  if (seedFacts.length > 0) {
    const factsToInsert = seedFacts.map((fact) => ({
      schoolId,
      factKey: fact.factKey,
      factValue: fact.factValue,
      provenance: "PLACES" as const,
      asOf: collectedAt,
    }));

    await db.insert(facts).values(factsToInsert);
  }

  return { schoolId, queueId, isNew };
}

/**
 * Parse address from Google Places addressComponents
 * Google provides structured address data, so we rely on it exclusively
 */
function parseAddressFromComponents(addressComponents: any[] | undefined): {
  city: string | null;
  state: string | null;
  country: string | null;
  streetAddress: string | null;
  postalCode: string | null;
} {
  let city: string | null = null;
  let state: string | null = null;
  let country: string | null = null;
  let streetNumber: string | null = null;
  let route: string | null = null;
  let postalCode: string | null = null;

  // Use Google's structured addressComponents (already parsed by Google)
  if (addressComponents && Array.isArray(addressComponents)) {
    for (const component of addressComponents) {
      const types = component.types || [];
      // Google Places API (New) uses longText and shortText
      const longName = component.longText || component.longName || "";
      const shortName = component.shortText || component.shortName || "";

      // Extract street number
      if (!streetNumber && types.includes("street_number")) {
        streetNumber = longName || shortName || null;
      }

      // Extract route (street name)
      if (!route && types.includes("route")) {
        route = longName || shortName || null;
      }

      // Extract city (locality or sublocality)
      if (
        !city &&
        (types.includes("locality") || types.includes("sublocality"))
      ) {
        city = longName || shortName || null;
      }

      // Extract state (administrative_area_level_1)
      if (!state && types.includes("administrative_area_level_1")) {
        // Prefer short name for state codes (e.g., "TX" instead of "Texas")
        state = shortName || longName || null;
      }

      // Extract country
      if (!country && types.includes("country")) {
        // Prefer short name for country codes (e.g., "US" instead of "United States")
        country = shortName || longName || null;
      }

      // Extract postal code
      if (!postalCode && types.includes("postal_code")) {
        postalCode = shortName || longName || null;
      }
    }
  }

  // Combine street number and route into street address
  const streetAddress =
    streetNumber && route
      ? `${streetNumber} ${route}`.trim()
      : streetNumber || route || null;

  return {
    city: city || null,
    state: state || null,
    country: country || null,
    streetAddress,
    postalCode: postalCode || null,
  };
}

export const seedsRouter = router({
  geocode: isAdmin
    .input(z.object({ address: z.string().min(1) }))
    .query(async ({ input }) => {
      const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
      if (!GOOGLE_PLACES_API_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Google Places API key not configured",
        });
      }

      try {
        const url = new URL(
          "https://maps.googleapis.com/maps/api/geocode/json"
        );
        url.searchParams.set("address", input.address);
        url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
          return {
            lat: data.results[0].geometry.location.lat,
            lng: data.results[0].geometry.location.lng,
          };
        }
        return null;
      } catch (error) {
        console.error("Geocoding error:", error);
        return null;
      }
    }),
  discover: isAdmin
    .input(
      z.object({
        city: z.string().min(1),
        radiusKm: z.number().min(1).max(500),
        query: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check quota
      const userId = ctx.session?.user?.id || "";
      const quotaCheck = await checkDiscoverQuota(userId, 10);
      if (!quotaCheck.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: quotaCheck.error || "Discover quota exceeded",
        });
      }

      try {
        const result = await search({
          city: input.city,
          radiusKm: input.radiusKm,
          query: input.query,
        });
        return result;
      } catch (error) {
        // Log detailed error information
        console.error("Discovery error:", {
          error: error instanceof Error ? error.message : String(error),
          city: input.city,
          radiusKm: input.radiusKm,
          query: input.query,
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Return empty results on error rather than throwing
        // The UI will show the error message from tRPC
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to discover flight schools. Please check your API key and ensure the Geocoding API is enabled.",
        });
      }
    }),
  exists: isAdmin
    .input(
      z
        .object({
          domain: z.string().optional(),
          name: z.string().optional(),
          phone: z.string().optional(),
        })
        .refine((data) => data.domain || data.name || data.phone, {
          message: "At least one of domain, name, or phone must be provided",
        })
    )
    .query(async ({ ctx, input }) => {
      // Normalize inputs
      const normalizeDomain = (domain: string | undefined): string | null => {
        if (!domain) return null;
        try {
          if (!domain.includes("://")) {
            return (
              domain
                .replace(/^www\./i, "")
                .replace(/\/+$/, "")
                .toLowerCase() || null
            );
          }
          const url = new URL(domain);
          return url.hostname.replace(/^www\./i, "").toLowerCase() || null;
        } catch {
          const match = domain.match(
            /(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i
          );
          return match?.[1]?.toLowerCase() || null;
        }
      };

      const normalizePhone = (phone: string | undefined): string | null => {
        if (!phone) return null;
        return phone.replace(/\D/g, "") || null;
      };

      const normalizedDomain = normalizeDomain(input.domain);
      const normalizedPhone = normalizePhone(input.phone);
      const normalizedName = input.name?.toLowerCase().trim();

      const matches: Array<{
        type: "school";
        id: string;
        name: string;
        domain?: string;
      }> = [];

      // Check schools only
      const schoolConditions = [];
      if (normalizedDomain) {
        schoolConditions.push(eq(schools.domain, normalizedDomain));
      }
      if (normalizedName) {
        schoolConditions.push(
          ilike(schools.canonicalName, `%${normalizedName}%`)
        );
      }
      if (normalizedPhone) {
        schoolConditions.push(
          or(
            eq(schools.phone, normalizedPhone),
            ilike(schools.phone, `%${normalizedPhone}%`)
          )
        );
      }

      if (schoolConditions.length > 0) {
        const schoolMatches = await ctx.db
          .select({
            id: schools.id,
            name: schools.canonicalName,
            domain: schools.domain,
            phone: schools.phone,
          })
          .from(schools)
          .where(and(or(...schoolConditions), isNotNull(schools.domain)));

        for (const school of schoolMatches) {
          // Additional filtering for exact matches
          let isMatch = false;
          if (normalizedDomain && school.domain) {
            const schoolDomain = normalizeDomain(school.domain);
            if (schoolDomain === normalizedDomain) isMatch = true;
          }
          if (normalizedName && school.name) {
            if (school.name.toLowerCase().trim() === normalizedName)
              isMatch = true;
          }
          if (normalizedPhone && school.phone) {
            const schoolPhone = normalizePhone(school.phone);
            if (schoolPhone === normalizedPhone) isMatch = true;
          }

          if (isMatch) {
            matches.push({
              type: "school",
              id: school.id,
              name: school.name,
              domain: school.domain || undefined,
            });
          }
        }
      }

      const existsInSchools = matches.length > 0;

      return {
        existsInSchools,
        matches,
      };
    }),
  import: isAdmin
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        lat: z.number(),
        lng: z.number(),
        placeId: z.string().optional(),
        rating: z.number().optional(),
        userRatingCount: z.number().optional(),
        businessStatus: z.string().optional(),
        priceLevel: z.string().optional(),
        regularOpeningHours: z.any().optional(),
        currentOpeningHours: z.any().optional(),
        photos: z
          .array(
            z.object({
              name: z.string(),
              widthPx: z.number().optional(),
              heightPx: z.number().optional(),
            })
          )
          .optional(),
        addressComponents: z.any().optional(),
        types: z.array(z.string()).optional(),
        primaryType: z.string().optional(),
        queryParams: z
          .object({
            city: z.string().optional(),
            radiusKm: z.number().optional(),
            query: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check quota
      const userId = ctx.session?.user?.id || "";
      const quotaCheck = await checkImportQuota(userId, 50);
      if (!quotaCheck.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: quotaCheck.error || "Import quota exceeded",
        });
      }

      // Extract city/state/country/street/postal from address using Google's structured addressComponents
      const addressData = parseAddressFromComponents(input.addressComponents);
      const now = new Date();

      // Create school directly from Google Places data
      const result = await createSchoolFromGooglePlaces(
        ctx.db,
        {
          name: input.name,
          website: input.website,
          phone: input.phone,
          placeId: input.placeId,
          rating: input.rating,
          userRatingCount: input.userRatingCount,
          businessStatus: input.businessStatus,
          priceLevel: input.priceLevel,
          photos: input.photos,
          regularOpeningHours: input.regularOpeningHours,
          currentOpeningHours: input.currentOpeningHours,
          formattedAddress: input.address || null,
          addressComponents: input.addressComponents || null,
          location: { lat: input.lat, lng: input.lng },
          types: input.types || null,
          primaryType: input.primaryType || null,
        },
        addressData,
        now
      );

      return {
        ok: true,
        schoolId: result.schoolId,
        queueId: result.queueId || undefined,
        isNew: result.isNew,
      };
    }),
  refreshGooglePlaces: isAdmin
    .input(z.object({ schoolId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch school from DB
      const school = await ctx.db.query.schools.findFirst({
        where: (q, { eq }) => eq(q.id, input.schoolId),
      });

      if (!school) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "School not found",
        });
      }

      // Get googlePlaceId from school record or from latest fact
      let googlePlaceId = school.googlePlaceId;

      if (!googlePlaceId) {
        // Try to get from facts
        const placeIdFact = await ctx.db.query.facts.findFirst({
          where: (q, { and, eq }) =>
            and(
              eq(q.schoolId, input.schoolId),
              eq(q.factKey, FACT_KEYS.GOOGLE_PLACE_ID)
            ),
          orderBy: (facts, { desc }) => [desc(facts.asOf)],
        });

        if (placeIdFact && typeof placeIdFact.factValue === "string") {
          googlePlaceId = placeIdFact.factValue;
        }
      }

      if (!googlePlaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "School does not have a Google Place ID",
        });
      }

      // Fetch fresh data from Google Places
      const candidate = await fetchPlaceById(googlePlaceId);

      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Place not found in Google Places",
        });
      }

      // Update school record
      await ctx.db
        .update(schools)
        .set({
          lat: candidate.lat || null,
          lng: candidate.lng || null,
          googlePlaceId: candidate.placeId || null,
          phone: candidate.phone || school.phone || null,
          updatedAt: new Date(),
        })
        .where(eq(schools.id, input.schoolId));

      // Before creating new facts, check if there's a valid airport code from scraped data
      // This serves as a fallback if Google Places doesn't have the airport code
      const latestSnapshot = await ctx.db.query.snapshots.findFirst({
        where: (q, { eq }) => eq(q.schoolId, input.schoolId),
        orderBy: (snapshots, { desc }) => [desc(snapshots.asOf)],
      });

      let scrapedAirportCode: string | null = null;
      if (latestSnapshot?.rawJson) {
        const rawJson = latestSnapshot.rawJson as Record<string, unknown>;
        // Check locations array
        if (Array.isArray(rawJson.locations) && rawJson.locations.length > 0) {
          const firstLocation = rawJson.locations[0] as Record<string, unknown>;
          if (
            typeof firstLocation.airportCode === "string" &&
            firstLocation.airportCode !== "USA"
          ) {
            scrapedAirportCode = firstLocation.airportCode;
          }
        }
        // Check location string
        if (!scrapedAirportCode && typeof rawJson.location === "string") {
          const locationMatch = rawJson.location.match(/\b(K?[A-Z]{3,4})\b/);
          if (locationMatch && locationMatch[1] && locationMatch[1] !== "USA") {
            scrapedAirportCode = locationMatch[1];
          }
        }
      }

      // Create new facts with fresh data
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

      // If Google Places didn't extract an airport code, but we have one from scraped data, use it
      const hasAirportCodeFact = refreshFacts.some(
        (f) => f.factKey === FACT_KEYS.LOCATION_AIRPORT_CODE
      );
      if (!hasAirportCodeFact && scrapedAirportCode) {
        refreshFacts.push({
          factKey: FACT_KEYS.LOCATION_AIRPORT_CODE,
          factValue: scrapedAirportCode,
        });
      }

      // Before inserting new facts, delete any existing "USA" airport code facts
      // This cleans up invalid airport codes from previous extractions
      await ctx.db
        .delete(facts)
        .where(
          and(
            eq(facts.schoolId, input.schoolId),
            eq(facts.factKey, FACT_KEYS.LOCATION_AIRPORT_CODE),
            eq(facts.factValue, "USA")
          )
        );

      if (refreshFacts.length > 0) {
        const factsToInsert = refreshFacts.map((fact) => ({
          schoolId: input.schoolId,
          factKey: fact.factKey,
          factValue: fact.factValue,
          provenance: "PLACES" as const,
          asOf: now,
        }));

        await ctx.db.insert(facts).values(factsToInsert);
      }

      return {
        ok: true,
        schoolId: input.schoolId,
        updatedAt: now,
      };
    }),
});
