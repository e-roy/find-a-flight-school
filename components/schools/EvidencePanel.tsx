"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { formatAsOfDate, isFactOutdated, formatFactValue } from "@/lib/utils";

type Fact = {
  factKey: string;
  factValue: unknown;
  provenance: string;
  asOf: Date;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
};

interface EvidencePanelProps {
  facts: Fact[];
}

/**
 * Formats a fact key for display (e.g., "program.type" -> "Program Type")
 */
function formatFactKey(key: string): string {
  return key
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EvidencePanel({ facts }: EvidencePanelProps) {
  if (facts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No evidence available for this school.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group facts by fact_key (though they should already be unique per key from the router)
  const factsByKey = new Map<string, Fact[]>();
  for (const fact of facts) {
    const existing = factsByKey.get(fact.factKey) || [];
    existing.push(fact);
    factsByKey.set(fact.factKey, existing);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {Array.from(factsByKey.entries()).map(([factKey, factList]) => {
            // Use the first fact (should be the latest)
            const fact = factList[0]!;
            const isOutdated = isFactOutdated(fact.asOf);
            const formattedValue = formatFactValue(fact.factValue);

            return (
              <AccordionItem key={factKey} value={factKey}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatFactKey(factKey)}
                    </span>
                    {isOutdated && (
                      <Badge variant="outline" className="text-xs">
                        May be outdated
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Value
                      </p>
                      <p className="text-sm">{formattedValue}</p>
                    </div>
                    <Separator />
                    <div className="flex flex-wrap items-center gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Provenance
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {fact.provenance}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          As of
                        </p>
                        <p className="text-xs mt-1">
                          {formatAsOfDate(fact.asOf)}
                        </p>
                      </div>
                      {fact.verifiedBy && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Verified by
                          </p>
                          <p className="text-xs mt-1">{fact.verifiedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
