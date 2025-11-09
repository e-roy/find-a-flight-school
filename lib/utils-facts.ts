/**
 * Utilities for organizing and extracting facts from school data
 */

import { extractPhotoUrls } from "@/lib/utils-photos";
import { FACT_KEYS } from "@/types";
import { facts } from "@/db/schema/facts";

type FactWithStale = typeof facts.$inferSelect & { isStale: boolean };

export interface OrganizedFacts {
  programs: string[];
  costBand: string | undefined;
  costNotes: string | undefined;
  fleetAircraft: string[] | undefined;
  fleetCount: number | undefined;
  airportCode: string | undefined;
  address: string | undefined;
  email: string | undefined;
  phone: string | undefined;
  rating: number | undefined;
  ratingCount: number | undefined;
  photos: string[] | undefined;
  openingHours:
    | {
        openNow?: boolean;
        periods?: Array<{
          open: { day: number; hour: number; minute: number };
          close: { day: number; hour: number; minute: number };
        }>;
        weekdayText?: string[];
      }
    | undefined;
}

/**
 * Create a map of latest facts by key (non-stale facts)
 */
export function createLatestFactsMap(
  facts: FactWithStale[]
): Map<string, FactWithStale> {
  const latestFactsByKey = new Map<string, FactWithStale>();
  for (const fact of facts) {
    if (!latestFactsByKey.has(fact.factKey) || !fact.isStale) {
      latestFactsByKey.set(fact.factKey, fact);
    }
  }
  return latestFactsByKey;
}

/**
 * Organize facts by category, extracting the latest fact per key
 */
export function organizeFactsByCategory(
  facts: FactWithStale[] | undefined
): OrganizedFacts {
  if (!facts) {
    return {
      programs: [],
      costBand: undefined,
      costNotes: undefined,
      fleetAircraft: undefined,
      fleetCount: undefined,
      airportCode: undefined,
      address: undefined,
      email: undefined,
      phone: undefined,
      rating: undefined,
      ratingCount: undefined,
      photos: undefined,
      openingHours: undefined,
    };
  }

  const latestFactsByKey = createLatestFactsMap(facts);

  // Extract facts by category
  const programs: string[] = [];
  const programFacts = Array.from(latestFactsByKey.values()).filter(
    (f) => f.factKey === FACT_KEYS.PROGRAM_TYPE
  );
  for (const fact of programFacts) {
    const value = fact.factValue;
    if (typeof value === "string" && value.length > 0) {
      programs.push(value);
    }
  }

  const costBandFact = latestFactsByKey.get(FACT_KEYS.COST_BAND);
  const costNotesFact = latestFactsByKey.get(FACT_KEYS.COST_NOTES);
  const costBand =
    costBandFact && typeof costBandFact.factValue === "string"
      ? costBandFact.factValue
      : undefined;
  const costNotes =
    costNotesFact && typeof costNotesFact.factValue === "string"
      ? costNotesFact.factValue
      : undefined;

  const fleetAircraftFact = latestFactsByKey.get(FACT_KEYS.FLEET_AIRCRAFT);
  const fleetCountFact = latestFactsByKey.get(FACT_KEYS.FLEET_COUNT);
  const fleetAircraft =
    fleetAircraftFact && Array.isArray(fleetAircraftFact.factValue)
      ? (fleetAircraftFact.factValue as string[])
      : undefined;
  const fleetCount =
    fleetCountFact && typeof fleetCountFact.factValue === "number"
      ? fleetCountFact.factValue
      : undefined;

  const airportCodeFact = latestFactsByKey.get(
    FACT_KEYS.LOCATION_AIRPORT_CODE
  );
  const addressFact = latestFactsByKey.get(FACT_KEYS.LOCATION_ADDRESS);
  const airportCode =
    airportCodeFact && typeof airportCodeFact.factValue === "string"
      ? airportCodeFact.factValue
      : undefined;
  const address =
    addressFact && typeof addressFact.factValue === "string"
      ? addressFact.factValue
      : undefined;

  const emailFact = latestFactsByKey.get(FACT_KEYS.CONTACT_EMAIL);
  const phoneFact = latestFactsByKey.get(FACT_KEYS.CONTACT_PHONE);
  const email =
    emailFact && typeof emailFact.factValue === "string"
      ? emailFact.factValue
      : undefined;
  const phone =
    phoneFact && typeof phoneFact.factValue === "string"
      ? phoneFact.factValue
      : undefined;

  const ratingFact = latestFactsByKey.get(FACT_KEYS.RATING);
  const ratingCountFact = latestFactsByKey.get(FACT_KEYS.RATING_COUNT);
  const rating =
    ratingFact && typeof ratingFact.factValue === "number"
      ? ratingFact.factValue
      : undefined;
  const ratingCount =
    ratingCountFact && typeof ratingCountFact.factValue === "number"
      ? ratingCountFact.factValue
      : undefined;

  const photosFact = latestFactsByKey.get(FACT_KEYS.PHOTOS);
  const photos = photosFact
    ? extractPhotoUrls(photosFact.factValue)
    : undefined;

  const openingHoursFact = latestFactsByKey.get(FACT_KEYS.OPENING_HOURS);
  const openingHours =
    openingHoursFact && typeof openingHoursFact.factValue === "object"
      ? (openingHoursFact.factValue as {
          openNow?: boolean;
          periods?: Array<{
            open: { day: number; hour: number; minute: number };
            close: { day: number; hour: number; minute: number };
          }>;
          weekdayText?: string[];
        })
      : undefined;

  return {
    programs,
    costBand,
    costNotes,
    fleetAircraft,
    fleetCount,
    airportCode,
    address,
    email,
    phone,
    rating,
    ratingCount,
    photos,
    openingHours,
  };
}

