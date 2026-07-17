/**
 * Parse a school snapshot's rawJson (scraped/extracted data) into a typed
 * shape for display. The normalized `facts` table is often sparse, but the
 * latest snapshot frequently carries richer detail (timeline, training
 * format, simulator, instructors, locations, financing).
 */

import type { snapshots } from "@/db/schema/snapshots";

type Snapshot = typeof snapshots.$inferSelect;

export interface SnapshotLocation {
  address?: string;
  airportCode?: string;
  city?: string;
  state?: string;
}

export interface SnapshotDetails {
  programs: string[];
  trainingType: string[];
  fleet: string[];
  locations: SnapshotLocation[];
  simulatorAvailable: boolean | null;
  instructorCount: string | null;
  timelineText: string | null;
  description: string | null;
  financing: boolean | null;
  financingTypes: string[];
  financingUrl: string | null;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function formatTimeline(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const t = v as { minMonths?: number; maxMonths?: number };
  if (t.minMonths && t.maxMonths) return `${t.minMonths}–${t.maxMonths} mo`;
  if (t.minMonths) return `${t.minMonths}+ mo`;
  if (t.maxMonths) return `Up to ${t.maxMonths} mo`;
  return null;
}

export function parseSnapshot(
  snapshot: Snapshot | null | undefined
): SnapshotDetails | null {
  if (!snapshot?.rawJson || typeof snapshot.rawJson !== "object") return null;
  const d = snapshot.rawJson as Record<string, unknown>;

  const locations: SnapshotLocation[] = Array.isArray(d.locations)
    ? (d.locations as Record<string, unknown>[]).map((l) => ({
        address: typeof l.address === "string" ? l.address : undefined,
        airportCode: typeof l.airportCode === "string" ? l.airportCode : undefined,
        city: typeof l.city === "string" ? l.city : undefined,
        state: typeof l.state === "string" ? l.state : undefined,
      }))
    : [];

  return {
    programs: strArray(d.programs),
    trainingType: strArray(d.trainingType),
    fleet: strArray(d.fleet),
    locations,
    simulatorAvailable:
      typeof d.simulatorAvailable === "boolean" ? d.simulatorAvailable : null,
    instructorCount:
      typeof d.instructorCount === "string" ? d.instructorCount : null,
    timelineText: formatTimeline(d.typicalTimeline),
    description: typeof d.description === "string" ? d.description : null,
    financing: typeof d.financing === "boolean" ? d.financing : null,
    financingTypes: strArray(d.financingTypes),
    financingUrl: typeof d.financingUrl === "string" ? d.financingUrl : null,
  };
}
