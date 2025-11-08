"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidencePanel } from "@/components/schools/EvidencePanel";
import { TierBadge } from "@/components/schools/TierBadge";
import { formatAsOfDate, formatFactValue } from "@/lib/utils";
import { notFound } from "next/navigation";

export default function SchoolPage() {
  const params = useParams();
  const id = params.id as string;

  if (!id) {
    notFound();
  }

  const { data, isLoading, error } = trpc.schools.byIdWithFacts.useQuery({
    id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.school) {
    notFound();
  }

  const { school, facts, oldestAsOf, signals } = data;

  // Get key facts for summary (first 3-5 facts)
  const keyFacts = facts.slice(0, 5);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* School Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{school.canonicalName}</h1>
            {signals && (
              <TierBadge
                velocity={signals.trainingVelocity}
                reliability={signals.scheduleReliability}
                safetyNotes={signals.safetyNotes}
              />
            )}
          </div>
          {school.domain && (
            <div className="flex items-center gap-2">
              <a
                href={`https://${school.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-sm underline"
              >
                {school.domain}
              </a>
            </div>
          )}
          {oldestAsOf && (
            <p className="text-muted-foreground text-sm">
              Data as of {formatAsOfDate(oldestAsOf)}
            </p>
          )}
        </div>

        {/* Key Facts Summary */}
        {keyFacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {keyFacts.map((fact) => (
                  <div
                    key={fact.factKey}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {fact.factKey
                          .split(".")
                          .map(
                            (part) =>
                              part.charAt(0).toUpperCase() + part.slice(1)
                          )
                          .join(" ")}
                      </p>
                      <p className="text-sm mt-1">
                        {formatFactValue(fact.factValue)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {fact.provenance}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evidence Panel */}
        <EvidencePanel facts={facts} />
      </div>
    </div>
  );
}
