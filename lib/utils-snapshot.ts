/**
 * Utilities for extracting data from snapshot rawJson as fallback when facts are not available
 */

import { FACT_KEYS } from "@/types";
import { normalizeSnapshot } from "@/lib/normalize";

/**
 * Extract a fact value from snapshot rawJson as fallback
 * This is used when normalized facts are not available
 */
export function extractFromSnapshot(
  snapshot: { rawJson: unknown } | null | undefined,
  factKey: string
): string | string[] | number | null {
  if (!snapshot?.rawJson || typeof snapshot.rawJson !== "object") {
    return null;
  }

  const rawJson = snapshot.rawJson as Record<string, unknown>;

  switch (factKey) {
    case FACT_KEYS.PROGRAM_TYPE:
      if (Array.isArray(rawJson.programs)) {
        // Use normalize function to parse programs
        const normalized = normalizeSnapshot(rawJson, new Date());
        const programFacts = normalized.filter(
          (f) => f.factKey === FACT_KEYS.PROGRAM_TYPE
        );
        if (programFacts.length > 0) {
          return programFacts.map((f) => f.factValue as string);
        }
        // Fallback: return raw programs as strings
        return rawJson.programs
          .filter((p): p is string => typeof p === "string")
          .slice(0, 5); // Limit to 5
      }
      return null;

    case FACT_KEYS.COST_BAND:
    case FACT_KEYS.COST_NOTES:
      if (Array.isArray(rawJson.pricing)) {
        const normalized = normalizeSnapshot(rawJson, new Date());
        const costFact = normalized.find((f) => f.factKey === factKey);
        if (costFact) {
          return costFact.factValue as string;
        }
      }
      return null;

    case FACT_KEYS.FLEET_AIRCRAFT:
      if (Array.isArray(rawJson.fleet)) {
        const normalized = normalizeSnapshot(rawJson, new Date());
        const fleetFact = normalized.find(
          (f) => f.factKey === FACT_KEYS.FLEET_AIRCRAFT
        );
        if (fleetFact && Array.isArray(fleetFact.factValue)) {
          return fleetFact.factValue;
        }
        // Fallback: try to extract aircraft names from fleet strings
        const aircraft: string[] = [];
        for (const item of rawJson.fleet) {
          if (typeof item === "string") {
            // Simple extraction: look for common patterns
            const match = item.match(/(Cessna|Piper|Beechcraft|Cirrus|Diamond)\s+\w+/i);
            if (match) {
              aircraft.push(match[0]);
            }
          }
        }
        return aircraft.length > 0 ? aircraft : null;
      }
      return null;

    case FACT_KEYS.LOCATION_AIRPORT_CODE:
      // Try locations array first
      if (Array.isArray(rawJson.locations) && rawJson.locations.length > 0) {
        const firstLocation = rawJson.locations[0] as Record<string, unknown>;
        if (typeof firstLocation.airportCode === "string") {
          return firstLocation.airportCode;
        }
      }
      // Fallback to location string
      if (typeof rawJson.location === "string") {
        const normalized = normalizeSnapshot(rawJson, new Date());
        const airportFact = normalized.find(
          (f) => f.factKey === FACT_KEYS.LOCATION_AIRPORT_CODE
        );
        if (airportFact) {
          return airportFact.factValue as string;
        }
      }
      return null;

    case FACT_KEYS.LOCATION_ADDRESS:
      // Try locations array first
      if (Array.isArray(rawJson.locations) && rawJson.locations.length > 0) {
        const firstLocation = rawJson.locations[0] as Record<string, unknown>;
        if (typeof firstLocation.address === "string") {
          return firstLocation.address;
        }
      }
      // Fallback to location string
      if (typeof rawJson.location === "string") {
        const normalized = normalizeSnapshot(rawJson, new Date());
        const addressFact = normalized.find(
          (f) => f.factKey === FACT_KEYS.LOCATION_ADDRESS
        );
        if (addressFact) {
          return addressFact.factValue as string;
        }
        // If normalization didn't extract address, use raw location
        return rawJson.location;
      }
      return null;

    case FACT_KEYS.RATING:
      // Rating might be in rawJson but typically comes from Google Places
      // Check if it's a number
      if (typeof rawJson.rating === "number") {
        return rawJson.rating;
      }
      return null;

    case FACT_KEYS.RATING_COUNT:
      // Rating count might be in rawJson
      if (typeof rawJson.ratingCount === "number") {
        return rawJson.ratingCount;
      }
      if (typeof rawJson.user_ratings_total === "number") {
        return rawJson.user_ratings_total;
      }
      return null;

    default:
      return null;
  }
}

