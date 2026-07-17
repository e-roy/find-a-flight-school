import * as React from "react";
import { Award, ShieldCheck, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type DesignTier = "premier" | "verified" | "community" | "unverified";

const LABELS: Record<DesignTier, string> = {
  premier: "Premier",
  verified: "Verified",
  community: "Community-Verified",
  unverified: "Unverified",
};

function TierIcon({ tier }: { tier: DesignTier }) {
  const size = 15;
  if (tier === "premier") return <Award size={size} />;
  if (tier === "verified") return <ShieldCheck size={size} />;
  if (tier === "community") return <Users size={size} />;
  return <Shield size={size} />;
}

export interface TierBadgeProps {
  tier?: DesignTier;
  variant?: "soft" | "solid";
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

/** The product's trust signal. Fixed semantic colors per tier. */
export function TierBadge({
  tier = "unverified",
  variant = "soft",
  size = "md",
  showLabel = true,
  className,
}: TierBadgeProps) {
  return (
    <span
      className={cn(
        "ffs-tier",
        `ffs-tier--${variant}`,
        `tier-${tier}`,
        size === "sm" && "ffs-tier--sm",
        className
      )}
      title={LABELS[tier]}
    >
      <TierIcon tier={tier} />
      {showLabel && LABELS[tier]}
    </span>
  );
}
