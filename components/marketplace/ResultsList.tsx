"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { MapPin, Globe } from "lucide-react";
import { SaveButton } from "@/components/marketplace/SaveButton";
import type { schools } from "@/db/schema/schools";

type School = typeof schools.$inferSelect;

interface ResultsListProps {
  schools: School[] | undefined;
  isLoading: boolean;
}

export function ResultsList({ schools, isLoading }: ResultsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!schools || schools.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No schools found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your search filters to find more results.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {schools.map((school) => (
        <Link key={school.id} href={`/schools/${school.id}`}>
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xl">
                  {school.canonicalName}
                </CardTitle>
                <SaveButton schoolId={school.id} variant="ghost" size="icon" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {school.domain && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const url = school.domain.startsWith("http")
                        ? school.domain
                        : `https://${school.domain}`;
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    className="hover:text-primary underline text-left"
                  >
                    {school.domain}
                  </button>
                </div>
              )}
              {(() => {
                const addr = school.addrStd;
                if (
                  addr &&
                  typeof addr === "object" &&
                  addr !== null &&
                  !Array.isArray(addr)
                ) {
                  const addrObj = addr as Record<string, unknown>;
                  const addressParts = [
                    addrObj.city,
                    addrObj.state,
                    addrObj.country,
                  ]
                    .filter(
                      (part): part is string =>
                        typeof part === "string" && part.length > 0
                    )
                    .join(", ");

                  if (addressParts) {
                    return (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{addressParts}</span>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
