/**
 * Normalization parser: converts raw_json from snapshots into structured facts
 */

import {
  FACT_KEYS,
  PROGRAM_TYPES,
  COST_BANDS,
  type ProgramType,
  type CostBand,
  type FactValue,
} from "@/types";

export interface NormalizedFact {
  factKey: string;
  factValue: FactValue;
}

/**
 * Parse raw JSON from a snapshot into normalized facts
 * @param rawJson - The extracted JSON from Firecrawl
 * @param asOf - The timestamp from the snapshot (used for context, not returned)
 * @returns Array of normalized facts ready for insertion
 */
export function normalizeSnapshot(
  rawJson: Record<string, unknown>,
  asOf: Date
): NormalizedFact[] {
  const facts: NormalizedFact[] = [];

  // Parse programs
  if (Array.isArray(rawJson.programs)) {
    const programTypes = parsePrograms(rawJson.programs);
    for (const programType of programTypes) {
      facts.push({
        factKey: FACT_KEYS.PROGRAM_TYPE,
        factValue: programType,
      });
    }
  }

  // Parse pricing
  if (Array.isArray(rawJson.pricing)) {
    const { band, notes } = parsePricing(rawJson.pricing);
    if (band) {
      facts.push({
        factKey: FACT_KEYS.COST_BAND,
        factValue: band,
      });
    }
    if (notes) {
      facts.push({
        factKey: FACT_KEYS.COST_NOTES,
        factValue: notes,
      });
    }
  }

  // Parse fleet
  if (Array.isArray(rawJson.fleet)) {
    const { aircraft, count } = parseFleet(rawJson.fleet);
    if (aircraft.length > 0) {
      facts.push({
        factKey: FACT_KEYS.FLEET_AIRCRAFT,
        factValue: aircraft,
      });
    }
    if (count !== null) {
      facts.push({
        factKey: FACT_KEYS.FLEET_COUNT,
        factValue: count,
      });
    }
  }

  // Parse location
  if (typeof rawJson.location === "string" && rawJson.location.trim()) {
    const location = parseLocation(rawJson.location);
    if (location.airportCode) {
      facts.push({
        factKey: FACT_KEYS.LOCATION_AIRPORT_CODE,
        factValue: location.airportCode,
      });
    }
    if (location.address) {
      facts.push({
        factKey: FACT_KEYS.LOCATION_ADDRESS,
        factValue: location.address,
      });
    }
  }

  // Parse contact
  if (typeof rawJson.contact === "string" && rawJson.contact.trim()) {
    const contact = parseContact(rawJson.contact);
    if (contact.email) {
      facts.push({
        factKey: FACT_KEYS.CONTACT_EMAIL,
        factValue: contact.email,
      });
    }
    if (contact.phone) {
      facts.push({
        factKey: FACT_KEYS.CONTACT_PHONE,
        factValue: contact.phone,
      });
    }
  }

  return facts;
}

/**
 * Parse programs array into program types
 */
function parsePrograms(programs: unknown[]): ProgramType[] {
  const programTypes: ProgramType[] = [];
  const seen = new Set<ProgramType>();

  for (const program of programs) {
    if (typeof program !== "string") continue;

    const normalized = program.toLowerCase().trim();
    let matched: ProgramType | null = null;

    // Fuzzy matching for program types
    if (
      normalized.includes("private") ||
      normalized.includes("ppl") ||
      normalized === "pilot license"
    ) {
      matched = PROGRAM_TYPES.PPL;
    } else if (
      normalized.includes("instrument") ||
      normalized.includes("ir") ||
      normalized.includes("ifr")
    ) {
      matched = PROGRAM_TYPES.IR;
    } else if (
      normalized.includes("commercial") ||
      normalized.includes("cpl") ||
      normalized.includes("commercial pilot")
    ) {
      matched = PROGRAM_TYPES.CPL;
    } else if (
      normalized.includes("cfi") &&
      !normalized.includes("cfii") &&
      (normalized.includes("instructor") ||
        normalized.includes("flight instructor"))
    ) {
      matched = PROGRAM_TYPES.CFI;
    } else if (
      normalized.includes("cfii") ||
      (normalized.includes("instrument instructor") &&
        normalized.includes("cfi"))
    ) {
      matched = PROGRAM_TYPES.CFII;
    } else if (
      normalized.includes("multi") ||
      normalized.includes("multi-engine") ||
      normalized.includes("me")
    ) {
      matched = PROGRAM_TYPES.ME;
    }

    if (matched && !seen.has(matched)) {
      programTypes.push(matched);
      seen.add(matched);
    }
  }

  return programTypes;
}

/**
 * Parse pricing array into cost band and notes
 */
function parsePricing(pricing: unknown[]): {
  band: CostBand | null;
  notes: string | null;
} {
  const pricingText = pricing
    .filter((p) => typeof p === "string")
    .join("; ")
    .trim();

  if (!pricingText) {
    return { band: null, notes: null };
  }

  // Extract numeric values (dollars)
  const dollarMatches = pricingText.match(/\$[\d,]+/g);
  const numbers: number[] = [];

  if (dollarMatches) {
    for (const match of dollarMatches) {
      const num = parseInt(match.replace(/[$,]/g, ""), 10);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  }

  // Determine cost band based on extracted numbers
  let band: CostBand | null = null;
  if (numbers.length > 0) {
    const avgCost = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    if (avgCost < 10000) {
      band = COST_BANDS.LOW;
    } else if (avgCost <= 20000) {
      band = COST_BANDS.MID;
    } else {
      band = COST_BANDS.HIGH;
    }
  } else {
    // Heuristic: look for keywords
    const lower = pricingText.toLowerCase();
    if (
      lower.includes("affordable") ||
      lower.includes("low") ||
      lower.includes("budget")
    ) {
      band = COST_BANDS.LOW;
    } else if (
      lower.includes("premium") ||
      lower.includes("high") ||
      lower.includes("luxury")
    ) {
      band = COST_BANDS.HIGH;
    } else {
      band = COST_BANDS.MID; // Default to MID if unclear
    }
  }

  // Store raw pricing text as notes
  const notes =
    pricingText.length > 500 ? pricingText.substring(0, 500) : pricingText;

  return { band, notes };
}

/**
 * Parse fleet array into aircraft types and count
 */
function parseFleet(fleet: unknown[]): {
  aircraft: string[];
  count: number | null;
} {
  const aircraft: string[] = [];
  let totalCount: number | null = null;

  // Common aircraft patterns
  const aircraftPatterns = [
    /(Cessna\s+\d+[A-Z]?)/i,
    /(Piper\s+PA-?\d+)/i,
    /(Beechcraft\s+\w+)/i,
    /(Cirrus\s+SR\d+)/i,
    /(Diamond\s+DA\d+)/i,
    /(Mooney\s+\w+)/i,
    /(Bonanza\s+\w+)/i,
    /(Cherokee\s+\w+)/i,
    /(Warrior\s+\w+)/i,
    /(Archer\s+\w+)/i,
    /(Arrow\s+\w+)/i,
    /(Skyhawk\s+\w+)/i,
    /(Skyhawk)/i,
    /(C172)/i,
    /(C152)/i,
  ];

  for (const item of fleet) {
    if (typeof item !== "string") continue;

    // Extract aircraft types
    for (const pattern of aircraftPatterns) {
      const match = item.match(pattern);
      if (match && match[1]) {
        const aircraftType = match[1].trim();
        if (!aircraft.includes(aircraftType)) {
          aircraft.push(aircraftType);
        }
      }
    }

    // Try to extract count
    const countMatch = item.match(/(\d+)\s*(aircraft|plane|airplane)/i);
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      if (!isNaN(count)) {
        totalCount = (totalCount || 0) + count;
      }
    }
  }

  return {
    aircraft: [...new Set(aircraft)], // Deduplicate
    count: totalCount,
  };
}

/**
 * Parse location string into airport code or address
 */
function parseLocation(location: string): {
  airportCode: string | null;
  address: string | null;
} {
  const trimmed = location.trim();

  // Airport codes are typically 3-4 uppercase letters, possibly with spaces/dashes
  const airportCodePattern = /^([A-Z]{3,4})(?:\s|$|-)/;
  const match = trimmed.match(airportCodePattern);

  if (match && match[1]) {
    return {
      airportCode: match[1],
      address: null,
    };
  }

  // Not an airport code, treat as address
  return {
    airportCode: null,
    address: trimmed.length > 500 ? trimmed.substring(0, 500) : trimmed,
  };
}

/**
 * Parse contact string into email and/or phone
 */
function parseContact(contact: string): {
  email: string | null;
  phone: string | null;
} {
  const trimmed = contact.trim();
  const result: { email: string | null; phone: string | null } = {
    email: null,
    phone: null,
  };

  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = trimmed.match(emailPattern);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Phone pattern (US format: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, or 10 digits)
  const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
  const phoneMatch = trimmed.match(phonePattern);
  if (phoneMatch) {
    // Normalize phone number
    const normalized = phoneMatch[1].replace(/[^\d]/g, "");
    if (normalized.length === 10) {
      result.phone = normalized;
    }
  }

  return result;
}
