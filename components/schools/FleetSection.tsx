"use client";

import { FactSection, FactItem } from "./FactSection";
import { Plane } from "lucide-react";

interface FleetSectionProps {
  aircraft?: string[];
  count?: number;
}

export function FleetSection({ aircraft, count }: FleetSectionProps) {
  if ((!aircraft || aircraft.length === 0) && !count) {
    return null;
  }

  return (
    <FactSection title="Fleet" icon={<Plane className="h-5 w-5" />}>
      <div className="space-y-3">
        {aircraft && aircraft.length > 0 && (
          <FactItem
            label="Aircraft Types"
            value={
              <div className="flex flex-wrap gap-2">
                {aircraft.map((type, index) => (
                  <span key={index} className="text-sm">
                    {type}
                    {index < aircraft.length - 1 && ","}
                  </span>
                ))}
              </div>
            }
          />
        )}
        {count !== undefined && (
          <FactItem label="Fleet Size" value={<p>{count} aircraft</p>} />
        )}
      </div>
    </FactSection>
  );
}
