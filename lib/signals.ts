export type Tier = "GOLD" | "SILVER" | "BRONZE";

export interface TierDisplayInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Computes the trust tier based on training velocity and schedule reliability.
 * - Gold: velocity ≥ 0.8 AND reliability ≥ 0.85
 * - Silver: velocity ≥ 0.6 AND reliability ≥ 0.7
 * - Bronze: else (including null values)
 */
export function computeTier(
  velocity: number | null | undefined,
  reliability: number | null | undefined
): Tier {
  // Treat null/undefined as 0 for tier computation
  const v = velocity ?? 0;
  const r = reliability ?? 0;

  if (v >= 0.8 && r >= 0.85) {
    return "GOLD";
  }
  if (v >= 0.6 && r >= 0.7) {
    return "SILVER";
  }
  return "BRONZE";
}

/**
 * Returns display information for a given tier (colors, labels).
 */
export function getTierDisplayInfo(tier: Tier): TierDisplayInfo {
  switch (tier) {
    case "GOLD":
      return {
        label: "Gold",
        color: "text-yellow-700 dark:text-yellow-600",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        borderColor: "border-yellow-300 dark:border-yellow-700",
      };
    case "SILVER":
      return {
        label: "Silver",
        color: "text-gray-700 dark:text-gray-300",
        bgColor: "bg-gray-100 dark:bg-gray-800",
        borderColor: "border-gray-300 dark:border-gray-600",
      };
    case "BRONZE":
      return {
        label: "Bronze",
        color: "text-orange-700 dark:text-orange-600",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        borderColor: "border-orange-300 dark:border-orange-700",
      };
  }
}

/**
 * Formats tooltip text explaining the tier and showing the metrics used.
 */
export function formatTierTooltip(
  velocity: number | null | undefined,
  reliability: number | null | undefined,
  safetyNotes: string | null | undefined
): string {
  const v = velocity ?? null;
  const r = reliability ?? null;
  const tier = computeTier(v, r);

  const parts: string[] = [];

  parts.push(`Tier: ${getTierDisplayInfo(tier).label}`);

  if (v !== null) {
    parts.push(`Training Velocity: ${(v * 100).toFixed(0)}%`);
  } else {
    parts.push("Training Velocity: Not available");
  }

  if (r !== null) {
    parts.push(`Schedule Reliability: ${(r * 100).toFixed(0)}%`);
  } else {
    parts.push("Schedule Reliability: Not available");
  }

  if (safetyNotes) {
    parts.push(`\nSafety Notes: ${safetyNotes}`);
  }

  return parts.join("\n");
}

