import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { schools } from "@/db/schema/schools";
import { sources } from "@/db/schema/sources";
import { facts } from "@/db/schema/facts";
import { or, ilike, eq, and, isNotNull, desc } from "drizzle-orm";
import { hasRole } from "@/lib/rbac";
import { search, searchByQuery, fetchPlaceById } from "@/lib/discovery/google";
import { meterPlacesUsage, consumePlacesBudgetOrThrow } from "@/lib/places-budget";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileOrThrow } from "@/lib/turnstile";
import { deleteSchoolCascade } from "@/lib/remove-school";
import { normalizeGooglePlaces } from "@/lib/normalize-google-places";
import {
  refreshSchoolPlaces,
  refreshStalePhotosBatch,
  RefreshError,
} from "@/lib/refresh-school-places";

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
  collectedAt: Date,
  addedVia: string | null = null
): Promise<{ schoolId: string; isNew: boolean }> {
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

      // Return early - no facts for existing schools
      return { schoolId, isNew: false };
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
        addedVia,
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

      // No crawl enqueue: the pipeline is synchronous and admin-triggered, so a
      // "pending" row here would never be processed and the admin UI would show
      // the school as stuck "Crawling". New schools stay "Discovered" until an
      // admin (or verified owner) runs the crawl.
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
      addedVia,
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

  return { schoolId, isNew };
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
        await meterPlacesUsage();
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
    .query(async ({ input }) => {
      try {
        // Geocode + Places search count toward the monthly budget meter.
        await meterPlacesUsage(2);
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
      // import() makes no Google calls (it persists the discover payload), so no
      // budget metering is needed here.
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
        isNew: result.isNew,
      };
    }),
  refreshGooglePlaces: isAdmin
    .input(z.object({ schoolId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        const result = await refreshSchoolPlaces(input.schoolId);
        return { ok: true, schoolId: result.schoolId, updatedAt: result.updatedAt };
      } catch (error) {
        if (error instanceof RefreshError) {
          throw new TRPCError({
            code:
              error.reason === "NO_PLACE_ID" ? "BAD_REQUEST" : "NOT_FOUND",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Admin: on-demand budget-capped refresh of stale/broken school photos.
   * Same logic the daily cron runs.
   */
  refreshStalePhotos: isAdmin
    .input(z.object({ batch: z.number().min(1).max(200).optional() }).optional())
    .mutation(async ({ input }) => {
      return refreshStalePhotosBatch(input?.batch);
    }),

  /**
   * Public: search Google Places for a school to add. Gated by Turnstile +
   * per-IP rate limit + the fail-closed monthly Places budget.
   */
  publicDiscover: publicProcedure
    .input(
      z.object({
        // A name, a location, or both — e.g. "Sunrise Aviation" or "Houston TX".
        q: z.string().min(1).max(160),
        turnstileToken: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTurnstileOrThrow(input.turnstileToken, ctx.ip);
      await enforceRateLimit(ctx.ip, {
        limit: 8,
        windowSec: 60,
        name: "public-discover",
      });
      // Single Text Search = 1 billable call; fail closed if over budget.
      await consumePlacesBudgetOrThrow(1);

      const q = input.q.trim();
      // Steer results toward flight schools unless the user already said so.
      const textQuery = /flight\s*school/i.test(q) ? q : `${q} flight school`;
      try {
        const candidates = await searchByQuery(textQuery);
        return candidates
          .filter((c) => c.placeId && c.lat && c.lng)
          .map((c) => ({
            placeId: c.placeId as string,
            name: c.name,
            address: c.address,
            website: c.website,
            phone: c.phone,
            rating: c.rating,
            ratingCount: c.userRatingCount,
            lat: c.lat,
            lng: c.lng,
          }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Could not search for schools right now.",
        });
      }
    }),

  /**
   * Public: add the chosen school. Re-fetches the place server-side (never
   * trusts client-supplied data) and publishes immediately, tagged addedVia
   * "public" for admin moderation. Gated like publicDiscover.
   */
  publicSubmit: publicProcedure
    .input(
      z.object({
        placeId: z.string().min(1),
        turnstileToken: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyTurnstileOrThrow(input.turnstileToken, ctx.ip);
      await enforceRateLimit(ctx.ip, {
        limit: 5,
        windowSec: 300,
        name: "public-submit",
      });
      // One billable Place Details call to fetch trustworthy data.
      await consumePlacesBudgetOrThrow(1);

      const candidate = await fetchPlaceById(input.placeId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That place could not be found on Google.",
        });
      }

      const addressData = parseAddressFromComponents(
        candidate.addressComponents
      );
      const result = await createSchoolFromGooglePlaces(
        ctx.db,
        {
          name: candidate.name,
          website: candidate.website,
          phone: candidate.phone,
          placeId: candidate.placeId,
          rating: candidate.rating,
          userRatingCount: candidate.userRatingCount,
          businessStatus: candidate.businessStatus,
          priceLevel: candidate.priceLevel,
          photos: candidate.photos,
          regularOpeningHours: candidate.regularOpeningHours,
          currentOpeningHours: candidate.currentOpeningHours,
          formattedAddress: candidate.address || null,
          addressComponents: candidate.addressComponents || null,
          location: { lat: candidate.lat, lng: candidate.lng },
          types: candidate.types || null,
          primaryType: candidate.primaryType || null,
        },
        addressData,
        new Date(),
        "public"
      );

      return {
        ok: true,
        schoolId: result.schoolId,
        isNew: result.isNew,
      };
    }),

  /**
   * Public: check whether a Google Places result is already in the directory,
   * using the same dedup rule as submission (normalized domain, then placeId).
   * Lets the add-school finder offer "Visit school" instead of "Add this school".
   */
  publicExists: publicProcedure
    .input(
      z.object({
        placeId: z.string().optional(),
        website: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const normalizeDomain = (website: string | undefined): string | null => {
        if (!website) return null;
        try {
          if (!website.includes("://")) {
            return (
              website.replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase() ||
              null
            );
          }
          return new URL(website).hostname.replace(/^www\./i, "").toLowerCase() || null;
        } catch {
          const match = website.match(
            /(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i
          );
          return match?.[1]?.toLowerCase() || null;
        }
      };

      const domain = normalizeDomain(input.website);
      if (domain) {
        const byDomain = await ctx.db
          .select({ id: schools.id })
          .from(schools)
          .where(eq(schools.domain, domain))
          .limit(1);
        if (byDomain.length > 0) {
          return { exists: true, schoolId: byDomain[0].id };
        }
      }
      if (input.placeId) {
        const byPlace = await ctx.db
          .select({ id: schools.id })
          .from(schools)
          .where(eq(schools.googlePlaceId, input.placeId))
          .limit(1);
        if (byPlace.length > 0) {
          return { exists: true, schoolId: byPlace[0].id };
        }
      }
      return { exists: false, schoolId: null as string | null };
    }),

  /** Admin: schools added through the public flow, newest first. */
  listPublicAdditions: isAdmin
    .input(
      z.object({ limit: z.number().min(1).max(200).default(50) }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: schools.id,
          name: schools.canonicalName,
          domain: schools.domain,
          createdAt: schools.createdAt,
        })
        .from(schools)
        .where(eq(schools.addedVia, "public"))
        .orderBy(desc(schools.createdAt))
        .limit(input?.limit ?? 50);
    }),

  /** Admin: hard-remove a school and all of its dependent rows. */
  removeSchool: isAdmin
    .input(z.object({ schoolId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteSchoolCascade(input.schoolId);
      return { ok: true };
    }),
});
