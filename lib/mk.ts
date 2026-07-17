/**
 * Mapping helpers: convert real DB/tRPC data shapes into the marketplace
 * redesign view-model (MkSchool) consumed by the new mk/* components.
 */

import type { schools } from "@/db/schema/schools";
import type { DesignTier } from "@/components/mk/TierBadge";
import type { Band } from "@/components/mk/CostBand";
import { getPhotoUrl } from "@/lib/utils-photos";

type School = typeof schools.$inferSelect;

export interface MkSchool {
  id: string;
  name: string;
  city?: string;
  state?: string;
  airportCode?: string;
  tier: DesignTier;
  programs: string[];
  aircraft: string[];
  fleetCount?: number;
  rating?: number;
  ratingCount?: number;
  costBand?: Band;
  costRange?: string;
  financing: boolean;
  monthlyFrom?: string;
  financingPartners?: string[];
  image: string | null;
  part?: string;
  blurb?: string;
}

interface SignalsLike {
  trainingVelocity: number | null;
  scheduleReliability: number | null;
}

/** Map the velocity/reliability signal scores onto the four design tiers.
 *  A verified owner claim guarantees at least the Community-Verified tier. */
export function mkTier(signals?: SignalsLike | null, claimed = false): DesignTier {
  const base = ((): DesignTier => {
    if (!signals) return "unverified";
    const v = signals.trainingVelocity ?? 0;
    const r = signals.scheduleReliability ?? 0;
    if (v >= 0.8 && r >= 0.85) return "premier";
    if (v >= 0.6 && r >= 0.7) return "verified";
    if (v > 0 || r > 0) return "community";
    return "unverified";
  })();
  if (claimed && base === "unverified") return "community";
  return base;
}

/** Generic expected-total-cost range label per band (matches filter copy). */
export function costRangeLabel(band?: Band | string): string | undefined {
  if (band === "LOW") return "$11k–$15k";
  if (band === "MID") return "$16k–$20k";
  if (band === "HIGH") return "$21k+";
  return undefined;
}

function asBand(value?: string): Band | undefined {
  if (value === "LOW" || value === "MID" || value === "HIGH") return value;
  return undefined;
}

function parseAddr(addr: unknown): { city?: string; state?: string } {
  if (!addr || typeof addr !== "object" || Array.isArray(addr)) return {};
  const o = addr as Record<string, unknown>;
  return {
    city: typeof o.city === "string" ? o.city : undefined,
    state: typeof o.state === "string" ? o.state : undefined,
  };
}

function domainFavicon(domain: string | null): string | null {
  if (!domain) return null;
  const host = domain.startsWith("http")
    ? new URL(domain).hostname
    : domain.replace(/^www\./, "");
  return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
}

function firstPhotoUrl(photos?: unknown, schoolId?: string | null): string | null {
  if (Array.isArray(photos) && photos.length > 0) {
    const url = getPhotoUrl(photos[0] as string | { name: string }, schoolId);
    if (url) return url;
  }
  return null;
}

/** Build the card image url: photo first, else domain favicon, else null. */
export function mkImage(
  school: Pick<School, "domain" | "id">,
  photos?: unknown
): string | null {
  return (
    firstPhotoUrl(photos, school.id) ?? domainFavicon(school.domain ?? null)
  );
}

interface SearchResultLike extends School {
  facts: {
    programs?: string[];
    costBand?: string;
    fleetAircraft?: string[];
    rating?: number;
    ratingCount?: number;
    photos?: unknown;
    financingAvailable?: boolean;
    airportCode?: string;
  };
}

/** From a marketplace.search result row. */
export function mkFromSearch(s: SearchResultLike): MkSchool {
  const { city, state } = parseAddr(s.addrStd);
  const band = asBand(s.facts.costBand);
  return {
    id: s.id,
    name: s.canonicalName,
    city,
    state,
    airportCode: s.facts.airportCode,
    tier: "unverified",
    programs: s.facts.programs ?? [],
    aircraft: s.facts.fleetAircraft ?? [],
    fleetCount: s.facts.fleetAircraft?.length,
    rating: s.facts.rating,
    ratingCount: s.facts.ratingCount,
    costBand: band,
    costRange: costRangeLabel(band),
    financing: s.facts.financingAvailable ?? false,
    image: mkImage(s, s.facts.photos),
  };
}

export interface OrganizedFactsLike {
  programs: string[];
  costBand?: string;
  costNotes?: string;
  fleetAircraft?: string[];
  fleetCount?: number;
  airportCode?: string;
  rating?: number;
  ratingCount?: number;
  photos?: string[];
}

/** From byIdWithFacts output (organized facts + signals + financing). */
export function mkFromFacts(args: {
  school: School;
  facts: OrganizedFactsLike;
  signals?: SignalsLike | null;
  claimed?: boolean;
  financing?: { available: boolean; monthlyFrom?: string; partners?: string[] };
}): MkSchool {
  const { school, facts, signals, claimed, financing } = args;
  const { city, state } = parseAddr(school.addrStd);
  const band = asBand(facts.costBand);
  return {
    id: school.id,
    name: school.canonicalName,
    city,
    state,
    airportCode: facts.airportCode,
    tier: mkTier(signals, claimed),
    programs: facts.programs ?? [],
    aircraft: facts.fleetAircraft ?? [],
    fleetCount: facts.fleetCount ?? facts.fleetAircraft?.length,
    rating: facts.rating,
    ratingCount: facts.ratingCount,
    costBand: band,
    costRange: costRangeLabel(band),
    financing: financing?.available ?? false,
    monthlyFrom: financing?.monthlyFrom,
    financingPartners: financing?.partners,
    image: mkImage(school, facts.photos),
  };
}
