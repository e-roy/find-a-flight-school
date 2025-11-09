import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { seedCandidates } from "@/db/schema/seeds";
import { schools } from "@/db/schema/schools";
import { sources } from "@/db/schema/sources";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { desc, or, ilike, eq, and, isNotNull } from "drizzle-orm";
import { resolveDomain } from "@/lib/resolver";
import { hasRole } from "@/lib/rbac";
import { search } from "@/lib/discovery/google";
import type { Candidate } from "@/lib/discovery/google";
import { checkDiscoverQuota, checkImportQuota } from "@/lib/quota";

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
  country: string | null
): { city: string; state: string | null; country: string | null } | null {
  if (!city) return null;

  return {
    city: city.trim(),
    state: state?.trim() || null,
    country: country?.trim() || null,
  };
}

export const seedsRouter = router({
  list: publicProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(50) }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      return ctx.db.query.seedCandidates.findMany({
        limit,
        orderBy: [desc(seedCandidates.createdAt)],
      });
    }),
  uploadRow: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        city: z.string().min(1),
        state: z.string().min(2),
        country: z.string().min(2),
        phone: z.string().optional(),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Insert with resolution_method/confidence rules from Phase 1
      await ctx.db.insert(seedCandidates).values({
        id: crypto.randomUUID(),
        name: input.name,
        city: input.city,
        state: input.state,
        country: input.country,
        phone: input.phone,
        website: input.website,
        resolutionMethod: input.website ? "manual" : null,
        confidence: input.website ? 1 : null,
      });
      return { ok: true };
    }),
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const searchTerm = `%${input.query}%`;
      return ctx.db
        .select()
        .from(seedCandidates)
        .where(
          or(
            ilike(seedCandidates.name, searchTerm),
            ilike(seedCandidates.city, searchTerm),
            ilike(seedCandidates.state, searchTerm)
          )
        )
        .orderBy(desc(seedCandidates.createdAt))
        .limit(100);
    }),
  rerunResolver: protectedProcedure
    .input(z.object({ seedId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const seed = await ctx.db.query.seedCandidates.findFirst({
        where: (q, { eq }) => eq(q.id, input.seedId),
      });

      if (!seed) {
        throw new Error("Seed candidate not found");
      }

      const resolveResult = await resolveDomain({
        name: seed.name,
        city: seed.city ?? undefined,
        state: seed.state ?? undefined,
        phone: seed.phone ?? undefined,
      });

      const updateData: {
        website?: string | null;
        resolutionMethod: string;
        confidence: number;
        evidenceJson: unknown;
        lastSeenAt: Date;
        updatedAt: Date;
      } = {
        resolutionMethod: "pattern_match",
        confidence: resolveResult.confidence,
        evidenceJson: resolveResult.evidence,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      };

      if (resolveResult.domain) {
        updateData.website = resolveResult.domain;
      }

      // Only update if new confidence is better or existing is null
      if (
        seed.confidence === null ||
        resolveResult.confidence > seed.confidence
      ) {
        await ctx.db
          .update(seedCandidates)
          .set(updateData)
          .where(eq(seedCandidates.id, input.seedId));
      } else {
        // Still update last_seen_at even if confidence didn't improve
        await ctx.db
          .update(seedCandidates)
          .set({
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(seedCandidates.id, input.seedId));
      }

      return {
        ok: true,
        domain: resolveResult.domain,
        confidence: resolveResult.confidence,
      };
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
        type: "seed" | "school";
        id: string;
        name: string;
        domain?: string;
      }> = [];

      // Check seed_candidates
      const seedConditions = [];
      if (normalizedDomain) {
        seedConditions.push(
          or(
            eq(seedCandidates.website, normalizedDomain),
            ilike(seedCandidates.website, `%${normalizedDomain}%`)
          )
        );
      }
      if (normalizedName) {
        seedConditions.push(ilike(seedCandidates.name, `%${normalizedName}%`));
      }
      if (normalizedPhone) {
        seedConditions.push(
          or(
            eq(seedCandidates.phone, normalizedPhone),
            ilike(seedCandidates.phone, `%${normalizedPhone}%`)
          )
        );
      }

      if (seedConditions.length > 0) {
        const seedMatches = await ctx.db
          .select({
            id: seedCandidates.id,
            name: seedCandidates.name,
            website: seedCandidates.website,
            phone: seedCandidates.phone,
          })
          .from(seedCandidates)
          .where(or(...seedConditions));

        for (const seed of seedMatches) {
          // Additional filtering for exact matches
          let isMatch = false;
          if (normalizedDomain && seed.website) {
            const seedDomain = normalizeDomain(seed.website);
            if (seedDomain === normalizedDomain) isMatch = true;
          }
          if (normalizedName && seed.name) {
            if (seed.name.toLowerCase().trim() === normalizedName)
              isMatch = true;
          }
          if (normalizedPhone && seed.phone) {
            const seedPhone = normalizePhone(seed.phone);
            if (seedPhone === normalizedPhone) isMatch = true;
          }

          if (isMatch) {
            matches.push({
              type: "seed",
              id: seed.id,
              name: seed.name,
              domain: seed.website || undefined,
            });
          }
        }
      }

      // Check schools
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

      const existsInSeeds = matches.some((m) => m.type === "seed");
      const existsInSchools = matches.some((m) => m.type === "school");

      return {
        existsInSeeds,
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

      // Extract city/state/country from address
      let city: string | null = null;
      let state: string | null = null;
      let country: string | null = null;

      if (input.address) {
        // Simple parsing: assume format like "City, State, Country" or "City, State"
        const parts = input.address.split(",").map((p) => p.trim());
        if (parts.length >= 1) city = parts[0] || null;
        if (parts.length >= 2) state = parts[1] || null;
        if (parts.length >= 3) country = parts[2] || null;
      }

      // Normalize domain
      const normalizeDomain = (website: string | undefined): string | null => {
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

      const normalizedWebsite = normalizeDomain(input.website);
      const now = new Date();

      // Prepare evidence JSON with enhanced fields
      const evidenceJson = {
        provider: "PLACES",
        source_type: "PLACES",
        place_id: input.placeId,
        query_params: input.queryParams || {},
        timestamp: now.toISOString(),
        candidate: {
          name: input.name,
          address: input.address,
          phone: input.phone,
          website: input.website,
          lat: input.lat,
          lng: input.lng,
        },
      };

      const seedId = crypto.randomUUID();
      await ctx.db.insert(seedCandidates).values({
        id: seedId,
        name: input.name,
        city,
        state,
        country,
        phone: input.phone || null,
        website: normalizedWebsite,
        resolutionMethod: normalizedWebsite ? "manual" : null,
        confidence: normalizedWebsite ? 1 : null,
        evidenceJson,
        firstSeenAt: now,
        lastSeenAt: now,
      });

      return { ok: true, seedId };
    }),
  promoteAndQueue: isAdmin
    .input(z.object({ seedId: z.string().uuid() }))
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

      try {
        // Fetch seed candidate
        const seed = await ctx.db.query.seedCandidates.findFirst({
          where: (q, { eq }) => eq(q.id, input.seedId),
        });

        if (!seed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Seed candidate not found",
          });
        }

        // Resolve domain if missing
        let domain = extractDomain(seed.website);
        if (!domain) {
          const resolveResult = await resolveDomain({
            name: seed.name,
            city: seed.city ?? undefined,
            state: seed.state ?? undefined,
            phone: seed.phone ?? undefined,
          });

          if (resolveResult.domain) {
            domain = resolveResult.domain;
            // Update seed with resolved domain
            await ctx.db
              .update(seedCandidates)
              .set({
                website: domain,
                resolutionMethod: "pattern_match",
                confidence: resolveResult.confidence,
                evidenceJson: resolveResult.evidence,
                updatedAt: new Date(),
              })
              .where(eq(seedCandidates.id, input.seedId));
          }
        }

        // Check for existing school by domain (dedupe check)
        let schoolId: string;
        let queueId: string | null = null;

        if (domain) {
          const existingSchool = await ctx.db
            .select()
            .from(schools)
            .where(eq(schools.domain, domain))
            .limit(1);

          if (existingSchool.length > 0) {
            // School already exists, just create source record
            schoolId = existingSchool[0].id;
            const sourceId = crypto.randomUUID();
            await ctx.db.insert(sources).values({
              id: sourceId,
              schoolId,
              sourceType: "PLACES",
              sourceRef: seed.id,
              observedDomain: domain,
              observedName: seed.name,
              observedPhone: seed.phone,
              observedAddr: normalizeAddress(
                seed.city,
                seed.state,
                seed.country
              ),
              collectedAt: seed.firstSeenAt || seed.createdAt || new Date(),
            });
          } else {
            // Create new school
            schoolId = crypto.randomUUID();
            const addrStd = normalizeAddress(
              seed.city,
              seed.state,
              seed.country
            );

            await ctx.db.insert(schools).values({
              id: schoolId,
              canonicalName: seed.name,
              addrStd,
              phone: seed.phone,
              domain,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Create source record for lineage
            const sourceId = crypto.randomUUID();
            await ctx.db.insert(sources).values({
              id: sourceId,
              schoolId,
              sourceType: "PLACES",
              sourceRef: seed.id,
              observedDomain: domain,
              observedName: seed.name,
              observedPhone: seed.phone,
              observedAddr: addrStd,
              collectedAt: seed.firstSeenAt || seed.createdAt || new Date(),
            });
          }

          // Enqueue crawl (check for existing pending job first)
          const existingJob = await ctx.db
            .select()
            .from(crawlQueue)
            .where(
              and(
                eq(crawlQueue.schoolId, schoolId),
                eq(crawlQueue.status, "pending")
              )
            )
            .limit(1);

          if (existingJob.length === 0) {
            queueId = crypto.randomUUID();
            await ctx.db.insert(crawlQueue).values({
              id: queueId,
              schoolId,
              domain,
              status: "pending",
              attempts: 0,
              scheduledAt: new Date(),
            });
          } else {
            queueId = existingJob[0].id;
          }
        } else {
          // No domain available, still create school but don't enqueue crawl
          schoolId = crypto.randomUUID();
          const addrStd = normalizeAddress(seed.city, seed.state, seed.country);

          await ctx.db.insert(schools).values({
            id: schoolId,
            canonicalName: seed.name,
            addrStd,
            phone: seed.phone,
            domain: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Create source record for lineage
          const sourceId = crypto.randomUUID();
          await ctx.db.insert(sources).values({
            id: sourceId,
            schoolId,
            sourceType: "PLACES",
            sourceRef: seed.id,
            observedDomain: null,
            observedName: seed.name,
            observedPhone: seed.phone,
            observedAddr: addrStd,
            collectedAt: seed.firstSeenAt || seed.createdAt || new Date(),
          });
        }

        return {
          ok: true,
          schoolId,
          queueId: queueId || undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to promote and queue seed",
        });
      }
    }),
  createFromUrl: isAdmin
    .input(
      z.object({
        url: z.string().url(),
        name: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Normalize URL to domain
      const normalizeDomain = (url: string): string => {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname.replace(/^www\./i, "").toLowerCase();
        } catch {
          // Fallback: try to extract domain from string
          const match = url.match(
            /(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i
          );
          if (match && match[1]) {
            return match[1].toLowerCase();
          }
          throw new Error("Invalid URL format");
        }
      };

      const normalizedDomain = normalizeDomain(input.url);

      // Extract name from domain if not provided
      let name = input.name;
      if (!name) {
        const domainParts = normalizedDomain.split(".");
        name = domainParts[0]
          .split(/[-_]/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ");
      }

      const now = new Date();
      const evidenceJson = {
        source_type: "MANUAL",
        url: input.url,
      };

      const seedId = crypto.randomUUID();
      await ctx.db.insert(seedCandidates).values({
        id: seedId,
        name,
        city: input.city || null,
        state: input.state || null,
        country: input.country || null,
        website: normalizedDomain,
        resolutionMethod: "manual",
        confidence: 1,
        evidenceJson,
        firstSeenAt: now,
        lastSeenAt: now,
      });

      return { ok: true, seedId };
    }),
});
