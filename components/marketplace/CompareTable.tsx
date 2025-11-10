"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/schools/TierBadge";
import { FACT_KEYS } from "@/types";
import { formatFactValue, cn } from "@/lib/utils";
import { extractFinancingInfo } from "@/lib/utils-financing";
import { extractFromSnapshot } from "@/lib/utils-snapshot";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { X, CreditCard, Star } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { schools } from "@/db/schema/schools";
import type { facts } from "@/db/schema/facts";
import type { signalsMock } from "@/db/schema/signals_mock";
import type { snapshots } from "@/db/schema/snapshots";

type School = typeof schools.$inferSelect;
type BaseFact = typeof facts.$inferSelect;
type Fact = BaseFact & { isStale?: boolean };
type Signals = typeof signalsMock.$inferSelect | null;
type Snapshot = typeof snapshots.$inferSelect | null;

interface SchoolWithFacts {
  school: School;
  facts: Fact[];
  signals: Signals;
  latestSnapshot: Snapshot;
}

interface CompareTableProps {
  schools: SchoolWithFacts[];
}

/**
 * Extract latest fact value for a given key, with fallback to snapshot
 */
function getLatestFactValue(
  facts: Fact[],
  factKey: string,
  snapshot: Snapshot | null
): string | string[] | number | null {
  // First try to get from facts (normalized data)
  const latestFact = facts.find((f) => f.factKey === factKey && !f.isStale);
  if (latestFact) {
    const value = latestFact.factValue;
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value;
    if (typeof value === "number") return value;
    return null;
  }

  // Fallback to snapshot rawJson if facts are not available
  if (snapshot) {
    return extractFromSnapshot(snapshot, factKey);
  }

  return null;
}

/**
 * Format fact value for display
 */
function formatValue(value: string | string[] | number | null): string {
  if (value === null) return "N/A";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "N/A";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return value;
}

/**
 * Truncate text component with hover card for full content
 */
function TruncatedText({
  text,
  maxLength = 50,
  className = "",
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) {
  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }

  const truncated = text.substring(0, maxLength).trim() + "...";

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className={cn("cursor-help underline decoration-dotted", className)}>
          {truncated}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-md">
        <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Truncate array of strings with hover card for full list
 */
function TruncatedList({
  items,
  maxItems = 3,
  className = "",
}: {
  items: string[];
  maxItems?: number;
  className?: string;
}) {
  if (items.length <= maxItems) {
    return <span className={className}>{items.join(", ")}</span>;
  }

  const displayed = items.slice(0, maxItems);
  const remaining = items.slice(maxItems);
  const displayedText = displayed.join(", ");
  const fullText = items.join(", ");

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className={cn("cursor-help", className)}>
          {displayedText}
          <span className="text-muted-foreground"> +{remaining.length} more</span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-md">
        <div className="space-y-1">
          <p className="text-sm font-medium">All items:</p>
          <ul className="text-sm list-disc list-inside space-y-1">
            {items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function CompareTable({ schools }: CompareTableProps) {
  const utils = trpc.useUtils();
  const { data: comparisonData } = trpc.marketplace.compare.get.useQuery();

  const setMutation = trpc.marketplace.compare.set.useMutation({
    onSuccess: () => {
      utils.marketplace.compare.get.invalidate();
      toast.success("School removed from comparison");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove school");
    },
  });

  const handleRemove = (schoolId: string) => {
    if (!comparisonData) return;
    const newIds = comparisonData.schoolIds.filter((id) => id !== schoolId);
    setMutation.mutate({ schoolIds: newIds });
  };

  if (schools.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">School</TableHead>
            {schools.map((schoolData) => (
              <TableHead key={schoolData.school.id} className="min-w-[200px]">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/schools/${schoolData.school.id}`}
                    className="hover:underline font-medium flex-1 min-w-0"
                  >
                    <TruncatedText
                      text={schoolData.school.canonicalName}
                      maxLength={25}
                    />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(schoolData.school.id);
                    }}
                    aria-label="Remove from comparison"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Programs */}
          <TableRow>
            <TableCell className="font-medium">Programs</TableCell>
            {schools.map((schoolData) => {
              const programs = getLatestFactValue(
                schoolData.facts,
                FACT_KEYS.PROGRAM_TYPE,
                schoolData.latestSnapshot
              );
              const programArray = Array.isArray(programs) ? programs : [];
              return (
                <TableCell key={schoolData.school.id}>
                  {programArray.length > 0 ? (
                    <TruncatedList items={programArray} maxItems={2} />
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Cost Band */}
          <TableRow>
            <TableCell className="font-medium">Cost Band</TableCell>
            {schools.map((schoolData) => {
              const costBand = getLatestFactValue(
                schoolData.facts,
                FACT_KEYS.COST_BAND,
                schoolData.latestSnapshot
              );
              const bandValue = typeof costBand === "string" ? costBand : null;
              return (
                <TableCell key={schoolData.school.id}>
                  {bandValue ? (
                    <Badge variant="outline">{bandValue}</Badge>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Fleet */}
          <TableRow>
            <TableCell className="font-medium">Fleet</TableCell>
            {schools.map((schoolData) => {
              const fleet = getLatestFactValue(
                schoolData.facts,
                FACT_KEYS.FLEET_AIRCRAFT,
                schoolData.latestSnapshot
              );
              const fleetArray = Array.isArray(fleet) ? fleet : [];
              return (
                <TableCell key={schoolData.school.id}>
                  {fleetArray.length > 0 ? (
                    <TruncatedList items={fleetArray} maxItems={2} />
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Location */}
          <TableRow>
            <TableCell className="font-medium">Location</TableCell>
            {schools.map((schoolData) => {
              const airportCode = getLatestFactValue(
                schoolData.facts,
                FACT_KEYS.LOCATION_AIRPORT_CODE,
                schoolData.latestSnapshot
              );
              const address = getLatestFactValue(
                schoolData.facts,
                FACT_KEYS.LOCATION_ADDRESS,
                schoolData.latestSnapshot
              );
              const location =
                typeof airportCode === "string"
                  ? airportCode
                  : typeof address === "string"
                  ? address
                  : null;
              return (
                <TableCell key={schoolData.school.id}>
                  {location ? (
                    <TruncatedText text={location} maxLength={30} />
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Cost Notes */}
          <TableRow>
            <TableCell className="font-medium">Cost Notes</TableCell>
            {schools.map((schoolData) => {
              const costNotes = getLatestFactValue(
                schoolData.facts,
                FACT_KEYS.COST_NOTES,
                schoolData.latestSnapshot
              );
              return (
                <TableCell key={schoolData.school.id}>
                  {typeof costNotes === "string" && costNotes ? (
                    <TruncatedText text={costNotes} maxLength={40} className="text-sm" />
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Rating */}
          <TableRow>
            <TableCell className="font-medium">Rating</TableCell>
            {schools.map((schoolData) => {
              // Try facts first
              const ratingFact = schoolData.facts.find(
                (f) => f.factKey === FACT_KEYS.RATING && !f.isStale
              );
              const ratingCountFact = schoolData.facts.find(
                (f) => f.factKey === FACT_KEYS.RATING_COUNT && !f.isStale
              );
              
              let rating: number | null = null;
              let ratingCount: number | null = null;

              if (ratingFact) {
                rating =
                  typeof ratingFact.factValue === "number"
                    ? ratingFact.factValue
                    : typeof ratingFact.factValue === "string"
                    ? parseFloat(ratingFact.factValue)
                    : null;
              } else {
                // Fallback to snapshot
                const snapshotRating = getLatestFactValue(
                  schoolData.facts,
                  FACT_KEYS.RATING,
                  schoolData.latestSnapshot
                );
                if (typeof snapshotRating === "number") {
                  rating = snapshotRating;
                }
              }

              if (ratingCountFact) {
                ratingCount =
                  typeof ratingCountFact.factValue === "number"
                    ? ratingCountFact.factValue
                    : typeof ratingCountFact.factValue === "string"
                    ? parseInt(ratingCountFact.factValue, 10)
                    : null;
              } else {
                // Fallback to snapshot
                const snapshotRatingCount = getLatestFactValue(
                  schoolData.facts,
                  FACT_KEYS.RATING_COUNT,
                  schoolData.latestSnapshot
                );
                if (typeof snapshotRatingCount === "number") {
                  ratingCount = snapshotRatingCount;
                }
              }

              return (
                <TableCell key={schoolData.school.id}>
                  {rating !== null && !isNaN(rating) ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{rating.toFixed(1)}</span>
                      {ratingCount !== null && !isNaN(ratingCount) && (
                        <span className="text-muted-foreground text-sm">
                          ({ratingCount})
                        </span>
                      )}
                    </div>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Financing */}
          <TableRow>
            <TableCell className="font-medium">Financing</TableCell>
            {schools.map((schoolData) => {
              const financingInfo = extractFinancingInfo(
                schoolData.latestSnapshot
              );
              return (
                <TableCell key={schoolData.school.id}>
                  {financingInfo?.available ? (
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Available</span>
                    </div>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Tier */}
          <TableRow>
            <TableCell className="font-medium">Tier</TableCell>
            {schools.map((schoolData) => (
              <TableCell key={schoolData.school.id}>
                {schoolData.signals ? (
                  <TierBadge
                    velocity={schoolData.signals.trainingVelocity}
                    reliability={schoolData.signals.scheduleReliability}
                    safetyNotes={schoolData.signals.safetyNotes}
                  />
                ) : (
                  "N/A"
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
