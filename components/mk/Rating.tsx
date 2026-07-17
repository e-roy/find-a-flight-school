import * as React from "react";
import { cn } from "@/lib/utils";

const STAR_PATH =
  "M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.07L7.3 14.5 2.6 9.92l6.5-.95L12 2.5z";

function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d={STAR_PATH} />
    </svg>
  );
}

export interface RatingProps {
  value: number;
  count?: number | null;
  showNumber?: boolean;
  className?: string;
}

/** Five-star display with fractional fill, numeric value, and review count. */
export function Rating({
  value,
  count = null,
  showNumber = true,
  className,
}: RatingProps) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const stars = [0, 1, 2, 3, 4];
  return (
    <span className={cn("ffs-rating", className)}>
      <span className="ffs-rating__stars" aria-label={`${value} out of 5`}>
        <span className="ffs-rating__base">
          {stars.map((i) => (
            <Star key={i} />
          ))}
        </span>
        <span className="ffs-rating__fill" style={{ width: `${pct}%` }}>
          {stars.map((i) => (
            <Star key={i} />
          ))}
        </span>
      </span>
      {showNumber && <span className="ffs-rating__num">{value.toFixed(1)}</span>}
      {count != null && (
        <span className="ffs-rating__count">({count.toLocaleString()})</span>
      )}
    </span>
  );
}
