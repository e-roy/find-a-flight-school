/**
 * De-duplication and canonicalization logic for seed candidates
 * Merges duplicates and promotes candidates to canonical schools
 */

import { db } from "@/lib/db";
import { seedCandidates } from "@/db/schema/seeds";
import { schools } from "@/db/schema/schools";
import { sources } from "@/db/schema/sources";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { type InferSelectModel } from "drizzle-orm";

type SeedCandidate = InferSelectModel<typeof seedCandidates>;
type School = InferSelectModel<typeof schools>;

export interface DedupeResult {
  merged: number;
  promoted: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters
 */
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, "") || null;
}

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
 * Normalize name for fuzzy matching
 * Strips suffixes like LLC, Inc, Aviation, Flight School, etc.
 * Removes punctuation, normalizes whitespace, lowercases
 */
export function normalizeName(name: string): string {
  if (!name) return "";

  let normalized = name.trim();

  // Remove common suffixes (case-insensitive)
  const suffixes = [
    /\s+llc\s*$/i,
    /\s+inc\.?\s*$/i,
    /\s+incorporated\s*$/i,
    /\s+corp\.?\s*$/i,
    /\s+corporation\s*$/i,
    /\s+aviation\s*$/i,
    /\s+flight\s+school\s*$/i,
    /\s+flight\s+academy\s*$/i,
    /\s+aviation\s+academy\s*$/i,
    /\s+flight\s+training\s*$/i,
    /\s+aviation\s+training\s*$/i,
  ];

  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, "");
  }

  // Remove punctuation, normalize whitespace, lowercase
  normalized = normalized
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return normalized;
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

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Levenshtein distance
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Calculate combined name+city similarity
 */
function nameCitySimilarity(
  name1: string,
  city1: string | null,
  name2: string,
  city2: string | null
): number {
  const normName1 = normalizeName(name1);
  const normName2 = normalizeName(name2);
  const nameSim = stringSimilarity(normName1, normName2);

  // If cities match (case-insensitive), boost similarity
  const cityMatch =
    city1 && city2 && city1.trim().toLowerCase() === city2.trim().toLowerCase();

  if (cityMatch) {
    // Weighted average: 70% name, 30% city match bonus
    return Math.min(1, nameSim * 0.7 + 0.3);
  }

  return nameSim;
}

/**
 * Check if two candidates should be merged
 * Returns true if they match on:
 * - Same normalized phone number, OR
 * - Same normalized domain, OR
 * - High name+city similarity (≥0.85)
 */
function shouldMerge(
  candidate1: SeedCandidate,
  candidate2: SeedCandidate
): boolean {
  // Phone match
  const phone1 = normalizePhone(candidate1.phone);
  const phone2 = normalizePhone(candidate2.phone);
  if (phone1 && phone2 && phone1 === phone2) {
    return true;
  }

  // Domain match
  const domain1 = extractDomain(candidate1.website);
  const domain2 = extractDomain(candidate2.website);
  if (domain1 && domain2 && domain1 === domain2) {
    return true;
  }

  // Name+city similarity
  const similarity = nameCitySimilarity(
    candidate1.name,
    candidate1.city,
    candidate2.name,
    candidate2.city
  );
  if (similarity >= 0.85) {
    return true;
  }

  return false;
}

/**
 * Select the best candidate from a group (highest confidence)
 * Falls back to most recent if confidence is equal or null
 */
function selectBestCandidate(candidates: SeedCandidate[]): SeedCandidate {
  return candidates.reduce((best, current) => {
    // Prefer higher confidence
    const bestConf = best.confidence ?? 0;
    const currentConf = current.confidence ?? 0;
    if (currentConf > bestConf) return current;
    if (bestConf > currentConf) return best;

    // If confidence equal, prefer more recent
    const bestDate = best.lastSeenAt || best.firstSeenAt || best.createdAt;
    const currentDate =
      current.lastSeenAt || current.firstSeenAt || current.createdAt;
    if (bestDate && currentDate) {
      return new Date(currentDate) > new Date(bestDate) ? current : best;
    }

    return best;
  });
}

/**
 * Promote a seed candidate to a canonical school
 * Creates school record and source record for lineage
 */
export async function promoteCandidateToSchool(candidateId: string): Promise<{
  schoolId: string;
  error?: string;
}> {
  try {
    // Fetch candidate
    const candidate = await db
      .select()
      .from(seedCandidates)
      .where(eq(seedCandidates.id, candidateId))
      .limit(1);

    if (candidate.length === 0) {
      return { schoolId: "", error: `Candidate ${candidateId} not found` };
    }

    const seed = candidate[0];

    // Check if school with same domain already exists
    const domain = extractDomain(seed.website);
    if (domain) {
      const existing = await db
        .select()
        .from(schools)
        .where(eq(schools.domain, domain))
        .limit(1);

      if (existing.length > 0) {
        // School already exists, just create source record
        const sourceId = crypto.randomUUID();
        await db.insert(sources).values({
          id: sourceId,
          schoolId: existing[0].id,
          sourceType: "MANUAL",
          sourceRef: seed.id,
          observedDomain: domain,
          observedName: seed.name,
          observedPhone: seed.phone,
          observedAddr: normalizeAddress(seed.city, seed.state, seed.country),
          collectedAt: seed.firstSeenAt || seed.createdAt || new Date(),
        });

        return { schoolId: existing[0].id };
      }
    }

    // Create new school
    const schoolId = crypto.randomUUID();
    const addrStd = normalizeAddress(seed.city, seed.state, seed.country);

    await db.insert(schools).values({
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
    await db.insert(sources).values({
      id: sourceId,
      schoolId,
      sourceType: "MANUAL",
      sourceRef: seed.id,
      observedDomain: domain,
      observedName: seed.name,
      observedPhone: seed.phone,
      observedAddr: addrStd,
      collectedAt: seed.firstSeenAt || seed.createdAt || new Date(),
    });

    return { schoolId };
  } catch (error) {
    return {
      schoolId: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run deduplication process
 * Groups candidates by merge keys, selects best from each group, and promotes
 */
export async function runDeduplication(): Promise<DedupeResult> {
  const result: DedupeResult = {
    merged: 0,
    promoted: 0,
    errors: [],
  };

  try {
    // Fetch all candidates that haven't been promoted yet
    // (We'll track this by checking if they have a corresponding source record)
    const allCandidates = await db
      .select()
      .from(seedCandidates)
      .orderBy(seedCandidates.createdAt);

    if (allCandidates.length === 0) {
      return result;
    }

    // Group candidates by merge keys
    const groups: SeedCandidate[][] = [];
    const processed = new Set<string>();

    for (const candidate of allCandidates) {
      if (processed.has(candidate.id)) continue;

      // Find all candidates that should merge with this one
      const group: SeedCandidate[] = [candidate];
      processed.add(candidate.id);

      for (const other of allCandidates) {
        if (processed.has(other.id)) continue;
        if (shouldMerge(candidate, other)) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    // Process each group
    for (const group of groups) {
      if (group.length === 0) continue;

      // Select best candidate from group
      const best = selectBestCandidate(group);

      // Promote the best candidate
      const promoteResult = await promoteCandidateToSchool(best.id);

      if (promoteResult.error) {
        result.errors.push({
          id: best.id,
          error: promoteResult.error,
        });
      } else {
        result.promoted++;
        if (group.length > 1) {
          result.merged += group.length - 1;
        }
      }
    }

    return result;
  } catch (error) {
    result.errors.push({
      id: "",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error in runDeduplication",
    });
    return result;
  }
}
