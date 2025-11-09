"use client";

import { FactSection, FactItem } from "./FactSection";
import { MapPin, ExternalLink } from "lucide-react";
import type { schools } from "@/db/schema/schools";

type School = typeof schools.$inferSelect;

interface LocationSectionProps {
  school: School;
  airportCode?: string;
  address?: string;
}

export function LocationSection({
  school,
  airportCode,
  address,
}: LocationSectionProps) {
  const addr = school.addrStd;
  let addressParts: string | null = null;

  if (
    addr &&
    typeof addr === "object" &&
    addr !== null &&
    !Array.isArray(addr)
  ) {
    const addrObj = addr as Record<string, unknown>;
    const parts = [addrObj.city, addrObj.state, addrObj.country]
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0
      )
      .join(", ");

    if (parts) {
      addressParts = parts;
    }
  }

  const displayAddress = address || addressParts;

  if (!airportCode && !displayAddress) {
    return null;
  }

  // Build Google Maps search URL
  const mapQuery = airportCode || displayAddress || school.canonicalName;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapQuery
  )}`;

  return (
    <FactSection title="Location" icon={<MapPin className="h-5 w-5" />}>
      <div className="space-y-3">
        {airportCode && (
          <FactItem
            label="Airport Code"
            value={
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">
                  {airportCode}
                </span>
              </div>
            }
          />
        )}
        {displayAddress && (
          <FactItem
            label="Address"
            value={
              <div className="flex items-center gap-2">
                <span className="text-sm">{displayAddress}</span>
              </div>
            }
          />
        )}
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2"
        >
          <ExternalLink className="h-4 w-4" />
          View on Google Maps
        </a>
      </div>
    </FactSection>
  );
}
