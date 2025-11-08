"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  computeTier,
  getTierDisplayInfo,
  formatTierTooltip,
} from "@/lib/signals";
import { cn } from "@/lib/utils";

interface TierBadgeProps {
  velocity: number | null | undefined;
  reliability: number | null | undefined;
  safetyNotes?: string | null | undefined;
  className?: string;
}

export function TierBadge({
  velocity,
  reliability,
  safetyNotes,
  className,
}: TierBadgeProps) {
  const tier = computeTier(velocity, reliability);
  const displayInfo = getTierDisplayInfo(tier);
  const tooltipText = formatTierTooltip(velocity, reliability, safetyNotes);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            displayInfo.color,
            displayInfo.bgColor,
            displayInfo.borderColor,
            className
          )}
        >
          {displayInfo.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <pre className="whitespace-pre-wrap text-xs">{tooltipText}</pre>
      </TooltipContent>
    </Tooltip>
  );
}

