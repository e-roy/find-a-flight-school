/**
 * Normalization parser: converts Google Places data into structured facts
 */

import { FACT_KEYS, type FactValue } from "@/types";
import type { NormalizedFact } from "@/lib/normalize";

/**
 * Common country codes to exclude from airport code extraction
 */
const COUNTRY_CODES = new Set([
  "USA",
  "CAN",
  "MEX",
  "GBR",
  "FRA",
  "DEU",
  "ITA",
  "ESP",
  "NLD",
  "BEL",
  "AUS",
  "NZL",
  "JPN",
  "CHN",
  "IND",
  "BRA",
  "ARG",
  "CHL",
  "COL",
  "PER",
  "RUS",
  "UKR",
  "POL",
  "SWE",
  "NOR",
  "DNK",
  "FIN",
  "CHE",
  "AUT",
  "PRT",
  "GRC",
  "TUR",
  "EGY",
  "ZAF",
  "KEN",
  "NGA",
  "THA",
  "IDN",
  "PHL",
  "VNM",
  "KOR",
  "SGP",
  "MYS",
  "ARE",
  "SAU",
  "ISR",
  "IRN",
  "IRQ",
  "PAK",
  "BGD",
]);

/**
 * Extract airport code from Google Places data
 * Attempts to find airport codes in place name, formattedAddress, addressComponents, or types
 */
function extractAirportCodeFromPlaces(
  formattedAddress: string | null | undefined,
  addressComponents: any[] | null | undefined,
  types: string[] | null | undefined,
  placeName?: string | null | undefined
): string | null {
  // Check if place is at an airport
  const isAtAirport =
    types?.some((type) => type === "airport" || type.includes("airport")) ||
    false;

  // First, try to extract from place name (most reliable for airports)
  // Pattern: "Dallas Executive Airport-RBD" or "KRBD Airport" or "Airport Name (KRBD)"
  if (placeName) {
    // Look for ICAO codes (KXXX format) in name
    const icaoMatch = placeName.match(/\b(K[A-Z]{3})\b/);
    if (icaoMatch && icaoMatch[1]) {
      const code = icaoMatch[1];
      if (!COUNTRY_CODES.has(code)) {
        return code;
      }
    }

    // Look for codes in parentheses
    const parenMatch = placeName.match(/\(([A-Z]{3,4})\)/);
    if (parenMatch && parenMatch[1]) {
      const code = parenMatch[1];
      if (
        (code.length === 3 || (code.length === 4 && code.startsWith("K"))) &&
        !COUNTRY_CODES.has(code)
      ) {
        return code;
      }
    }

    // Look for codes after "Airport-" or before "Airport"
    // Pattern: "Dallas Executive Airport-RBD" or "Airport RBD" or "Airport-RBD"
    const airportDashMatch = placeName.match(/Airport[-\s]+([A-Z]{3,4})\b/i);
    if (airportDashMatch && airportDashMatch[1]) {
      const code = airportDashMatch[1].toUpperCase();
      if (
        (code.length === 3 || (code.length === 4 && code.startsWith("K"))) &&
        !COUNTRY_CODES.has(code)
      ) {
        // If it's a 3-letter code and we're at an airport, prepend "K" for ICAO
        if (code.length === 3 && isAtAirport && !code.startsWith("K")) {
          return `K${code}`;
        }
        return code;
      }
    }

    const airportBeforeMatch = placeName.match(/\b([A-Z]{3,4})\s+Airport/i);
    if (airportBeforeMatch && airportBeforeMatch[1]) {
      const code = airportBeforeMatch[1];
      if (
        (code.length === 3 || (code.length === 4 && code.startsWith("K"))) &&
        !COUNTRY_CODES.has(code)
      ) {
        return code;
      }
    }
  }

  if (!isAtAirport && !formattedAddress && !placeName) {
    return null;
  }

  // Try to extract from formattedAddress
  // Pattern: "123 Main St, Airport Name (KXXX), City, State" or "KXXX Airport"
  if (formattedAddress) {
    // First, look for ICAO codes (KXXX format) - most reliable
    const icaoMatch = formattedAddress.match(/\b(K[A-Z]{3})\b/);
    if (icaoMatch && icaoMatch[1]) {
      const code = icaoMatch[1];
      // Exclude country codes
      if (!COUNTRY_CODES.has(code)) {
        return code;
      }
    }

    // Look for airport codes in parentheses or before "Airport"
    // Pattern: "Airport Name (KXXX)" or "KXXX Airport"
    const parenMatch = formattedAddress.match(/\(([A-Z]{3,4})\)/);
    if (parenMatch && parenMatch[1]) {
      const code = parenMatch[1];
      if (
        (code.length === 3 || (code.length === 4 && code.startsWith("K"))) &&
        !COUNTRY_CODES.has(code)
      ) {
        return code;
      }
    }

    // Look for codes before "Airport" keyword
    const airportMatch = formattedAddress.match(/\b([A-Z]{3,4})\s+Airport/i);
    if (airportMatch && airportMatch[1]) {
      const code = airportMatch[1];
      if (
        (code.length === 3 || (code.length === 4 && code.startsWith("K"))) &&
        !COUNTRY_CODES.has(code)
      ) {
        return code;
      }
    }

    // Last resort: look for any 3-4 letter uppercase code, but exclude country codes
    const codeMatch = formattedAddress.match(/\b([A-Z]{3,4})\b/);
    if (codeMatch && codeMatch[1]) {
      const code = codeMatch[1];
      // Exclude country codes and only accept valid airport code patterns
      if (
        !COUNTRY_CODES.has(code) &&
        (code.length === 3 || (code.length === 4 && code.startsWith("K")))
      ) {
        return code;
      }
    }
  }

  // Check addressComponents for airport-related data
  if (addressComponents && Array.isArray(addressComponents)) {
    const airportComponent = addressComponents.find(
      (comp) =>
        comp.types?.includes("airport") ||
        comp.longText?.toLowerCase().includes("airport") ||
        comp.shortText?.toLowerCase().includes("airport")
    );

    if (airportComponent) {
      // Try to extract code from airport name
      const text = (
        airportComponent.longText ||
        airportComponent.shortText ||
        ""
      ).toUpperCase();

      // Look for ICAO code first
      const icaoMatch = text.match(/\b(K[A-Z]{3})\b/);
      if (icaoMatch && icaoMatch[1] && !COUNTRY_CODES.has(icaoMatch[1])) {
        return icaoMatch[1];
      }

      // Look for any 3-4 letter code
      const codeMatch = text.match(/\b([A-Z]{3,4})\b/);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1];
        if (
          (code.length === 3 || (code.length === 4 && code.startsWith("K"))) &&
          !COUNTRY_CODES.has(code)
        ) {
          // If 3-letter code at airport, convert to ICAO
          if (code.length === 3 && isAtAirport && !code.startsWith("K")) {
            return `K${code}`;
          }
          return code;
        }
      }
    }

    // Also check all components for airport codes in their text
    for (const comp of addressComponents) {
      const text = (comp.longText || comp.shortText || "").toUpperCase();
      // Look for patterns like "KRBD" or "RBD" in any component
      const icaoMatch = text.match(/\b(K[A-Z]{3})\b/);
      if (icaoMatch && icaoMatch[1] && !COUNTRY_CODES.has(icaoMatch[1])) {
        return icaoMatch[1];
      }
    }
  }

  return null;
}

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
  formattedAddress?: string | null;
  addressComponents?: any[] | null;
  location?: { lat: number; lng: number } | null;
  types?: string[] | null;
  primaryType?: string | null;
  placeId?: string | null;
  displayName?: string | null;
  name?: string | null;
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
  if (input.userRatingCount !== null && input.userRatingCount !== undefined) {
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

  // Formatted address
  if (input.formattedAddress) {
    facts.push({
      factKey: FACT_KEYS.LOCATION_ADDRESS,
      factValue: input.formattedAddress,
    });
  }

  // Extract and store airport code if available
  const airportCode = extractAirportCodeFromPlaces(
    input.formattedAddress,
    input.addressComponents,
    input.types,
    input.displayName || input.name
  );

  if (airportCode) {
    facts.push({
      factKey: FACT_KEYS.LOCATION_AIRPORT_CODE,
      factValue: airportCode,
    });
  }

  // Coordinates
  if (input.location) {
    facts.push({
      factKey: FACT_KEYS.GOOGLE_COORDINATES,
      factValue: { lat: input.location.lat, lng: input.location.lng },
    });
  }

  // Place ID
  if (input.placeId) {
    facts.push({
      factKey: FACT_KEYS.GOOGLE_PLACE_ID,
      factValue: input.placeId,
    });
  }

  // Place types
  if (input.types && input.types.length > 0) {
    facts.push({
      factKey: FACT_KEYS.GOOGLE_PLACE_TYPES,
      factValue: input.types,
    });
  }

  return facts;
}
