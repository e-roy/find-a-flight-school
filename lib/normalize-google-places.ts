/**
 * Normalization parser: converts Google Places data into structured facts
 */

import { FACT_KEYS, type FactValue } from "@/types";
import type { NormalizedFact } from "@/lib/normalize";

/**
 * Google Places input type (from discovery/import)
 */
export interface GooglePlacesInput {
  rating?: number | null;
  userRatingCount?: number | null;
  businessStatus?: string | null;
  priceLevel?: string | null;
  photos?: any;
  regularOpeningHours?: any;
  phone?: string | null;
}

/**
 * Parse Google Places data into normalized facts
 * @param input - Google Places data from discovery/import
 * @returns Array of normalized facts ready for insertion
 */
export function normalizeGooglePlaces(
  input: GooglePlacesInput
): NormalizedFact[] {
  const facts: NormalizedFact[] = [];

  // Rating
  if (input.rating !== null && input.rating !== undefined) {
    facts.push({
      factKey: FACT_KEYS.RATING,
      factValue: input.rating,
    });
  }

  // Rating count
  if (
    input.userRatingCount !== null &&
    input.userRatingCount !== undefined
  ) {
    facts.push({
      factKey: FACT_KEYS.RATING_COUNT,
      factValue: input.userRatingCount,
    });
  }

  // Business status
  if (input.businessStatus) {
    facts.push({
      factKey: FACT_KEYS.BUSINESS_STATUS,
      factValue: input.businessStatus,
    });
  }

  // Price level
  if (input.priceLevel) {
    facts.push({
      factKey: FACT_KEYS.PRICE_LEVEL,
      factValue: input.priceLevel,
    });
  }

  // Photos - validate it's an array with length > 0
  if (input.photos && Array.isArray(input.photos) && input.photos.length > 0) {
    facts.push({
      factKey: FACT_KEYS.PHOTOS,
      factValue: input.photos as FactValue,
    });
  }

  // Opening hours - store as-is (JSON object/array)
  if (input.regularOpeningHours) {
    facts.push({
      factKey: FACT_KEYS.OPENING_HOURS,
      factValue: input.regularOpeningHours as FactValue,
    });
  }

  // Phone - only create if phone exists (may already be in schools table, but fact provides provenance)
  if (input.phone) {
    facts.push({
      factKey: FACT_KEYS.CONTACT_PHONE,
      factValue: input.phone,
    });
  }

  return facts;
}

