import * as React from "react";
import { cn } from "@/lib/utils";

export type Band = "LOW" | "MID" | "HIGH";

const FILLED: Record<Band, number> = { LOW: 1, MID: 2, HIGH: 3 };
const WORD: Record<Band, string> = {
  LOW: "Lower cost",
  MID: "Mid range",
  HIGH: "Higher cost",
};

export interface CostBandProps {
  band?: Band;
  range?: string | null;
  showMeter?: boolean;
  className?: string;
}

/** Normalized "Expected Total Cost" indicator with a 3-segment meter. */
export function CostBand({
  band = "MID",
  range = null,
  showMeter = true,
  className,
}: CostBandProps) {
  const key = (band || "MID").toUpperCase() as Band;
  const on = FILLED[key] ?? 2;
  return (
    <div className={cn("ffs-cost", `band-${key.toLowerCase()}`, className)}>
      <div className="ffs-cost__top">
        <span className="ffs-cost__label">Expected total</span>
        {range && <span className="ffs-cost__range">{range}</span>}
        <span className="ffs-cost__range ffs-cost__band">{WORD[key]}</span>
      </div>
      {showMeter && (
        <div className="ffs-cost__meter" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn("ffs-cost__seg", i <= on && "on")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
