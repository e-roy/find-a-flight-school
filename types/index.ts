/**
 * Controlled vocabulary for fact keys and values
 */

// Fact key constants
export const FACT_KEYS = {
  PROGRAM_TYPE: "program.type",
  COST_BAND: "cost.band",
  COST_NOTES: "cost.notes",
  FLEET_AIRCRAFT: "fleet.aircraft",
  FLEET_COUNT: "fleet.count",
  LOCATION_AIRPORT_CODE: "location.airport_code",
  LOCATION_ADDRESS: "location.address",
  CONTACT_EMAIL: "contact.email",
  CONTACT_PHONE: "contact.phone",
  RATING: "rating.value",
  RATING_COUNT: "rating.count",
  BUSINESS_STATUS: "business.status",
  PRICE_LEVEL: "price.level",
  PHOTOS: "photos",
  OPENING_HOURS: "opening_hours",
  GOOGLE_COORDINATES: "google.coordinates",
  GOOGLE_PLACE_ID: "google.place_id",
  GOOGLE_PLACE_TYPES: "google.place_types",
} as const;

export type FactKey = (typeof FACT_KEYS)[keyof typeof FACT_KEYS];

// Program type enum
export const PROGRAM_TYPES = {
  PPL: "PPL",
  IR: "IR",
  CPL: "CPL",
  CFI: "CFI",
  CFII: "CFII",
  ME: "ME",
} as const;

export type ProgramType = (typeof PROGRAM_TYPES)[keyof typeof PROGRAM_TYPES];

// Cost band enum
export const COST_BANDS = {
  LOW: "LOW",
  MID: "MID",
  HIGH: "HIGH",
} as const;

export type CostBand = (typeof COST_BANDS)[keyof typeof COST_BANDS];

// Fact value types
export type FactValue =
  | ProgramType
  | CostBand
  | string
  | string[]
  | number
  | { lat: number; lng: number }
  | null;

// FAA Airport Data Types
export interface FAAAirportData {
  airportCode: string;
  airportName?: string;
  runways?: Array<{
    identifier: string;
    length: number;
    width: number;
    surface: string;
  }>;
  frequencies?: Array<{
    type: string; // CTAF, UNICOM, ATIS, Ground, Tower, etc.
    frequency: string;
  }>;
  fuelAvailable?: string[];
  services?: string[];
  elevation?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}
