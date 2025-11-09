"use client";

import { FactSection, FactItem } from "./FactSection";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

interface PricingSectionProps {
  costBand?: string;
  costNotes?: string;
}

export function PricingSection({ costBand, costNotes }: PricingSectionProps) {
  if (!costBand && !costNotes) {
    return null;
  }

  return (
    <FactSection title="Pricing" icon={<DollarSign className="h-5 w-5" />}>
      <div className="space-y-3">
        {costBand && (
          <FactItem
            label="Cost Band"
            value={
              <Badge
                variant={
                  costBand === "LOW"
                    ? "default"
                    : costBand === "MID"
                    ? "secondary"
                    : "outline"
                }
                className="text-sm"
              >
                {costBand}
              </Badge>
            }
          />
        )}
        {costNotes && (
          <FactItem label="Cost Details" value={<p>{costNotes}</p>} />
        )}
      </div>
    </FactSection>
  );
}
