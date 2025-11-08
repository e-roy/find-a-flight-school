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
import { TierBadge } from "@/components/schools/TierBadge";
import { FACT_KEYS } from "@/types";
import { formatFactValue } from "@/lib/utils";
import type { schools } from "@/db/schema/schools";
import type { facts } from "@/db/schema/facts";
import type { signalsMock } from "@/db/schema/signals_mock";

type School = typeof schools.$inferSelect;
type BaseFact = typeof facts.$inferSelect;
type Fact = BaseFact & { isStale?: boolean };
type Signals = typeof signalsMock.$inferSelect | null;

interface SchoolWithFacts {
  school: School;
  facts: Fact[];
  signals: Signals;
}

interface CompareTableProps {
  schools: SchoolWithFacts[];
}

/**
 * Extract latest fact value for a given key
 */
function getLatestFactValue(
  facts: Fact[],
  factKey: string
): string | string[] | null {
  // Get latest (non-stale) fact for this key
  const latestFact = facts.find((f) => f.factKey === factKey && !f.isStale);
  if (!latestFact) return null;

  const value = latestFact.factValue;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return null;
}

/**
 * Format fact value for display
 */
function formatValue(value: string | string[] | null): string {
  if (value === null) return "N/A";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "N/A";
  }
  return value;
}

export function CompareTable({ schools }: CompareTableProps) {
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
                <Link
                  href={`/schools/${schoolData.school.id}`}
                  className="hover:underline font-medium"
                >
                  {schoolData.school.canonicalName}
                </Link>
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
                FACT_KEYS.PROGRAM_TYPE
              );
              return (
                <TableCell key={schoolData.school.id}>
                  {formatValue(programs)}
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
                FACT_KEYS.COST_BAND
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
                FACT_KEYS.FLEET_AIRCRAFT
              );
              return (
                <TableCell key={schoolData.school.id}>
                  {formatValue(fleet)}
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
                FACT_KEYS.LOCATION_AIRPORT_CODE
              );
              const address = getLatestFactValue(
                schoolData.facts,
                FACT_KEYS.LOCATION_ADDRESS
              );
              const location =
                typeof airportCode === "string"
                  ? airportCode
                  : typeof address === "string"
                  ? address
                  : null;
              return (
                <TableCell key={schoolData.school.id}>
                  {location || "N/A"}
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
