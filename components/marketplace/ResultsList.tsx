"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { SchoolCard } from "@/components/marketplace/SchoolCard";
import type { schools } from "@/db/schema/schools";

type School = typeof schools.$inferSelect;

interface ResultsListProps {
  schools:
    | (School & {
        facts?: {
          programs?: string[];
          costBand?: string;
          fleetAircraft?: string[];
          rating?: number;
          ratingCount?: number;
          photos?: string[];
        };
      })[]
    | undefined;
  isLoading: boolean;
}

export function ResultsList({ schools, isLoading }: ResultsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-full flex flex-col mt-0 pt-0">
            {/* Image skeleton */}
            <Skeleton className="w-full h-48 rounded-t-lg" />
            <div className="p-4 space-y-3 flex-1">
              {/* Title skeleton */}
              <Skeleton className="h-6 w-3/4" />
              {/* Badges skeleton */}
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
              {/* Rating skeleton */}
              <Skeleton className="h-4 w-24" />
              {/* Other info skeleton */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {schools.map((school) => (
        <SchoolCard key={school.id} school={school} />
      ))}
    </div>
  );
}
