"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CompareTable } from "@/components/marketplace/CompareTable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ComparePage() {
  const router = useRouter();

  // Fetch comparison set
  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    error: comparisonError,
  } = trpc.marketplace.compare.get.useQuery(undefined, {
    retry: false,
  });

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (
      comparisonError &&
      (comparisonError.data?.code === "UNAUTHORIZED" ||
        comparisonError.message?.includes("UNAUTHORIZED") ||
        comparisonError.message?.includes("Unauthorized"))
    ) {
      const signInUrl = `/sign-in?callbackUrl=${encodeURIComponent(
        "/compare"
      )}`;
      router.push(signInUrl);
    }
  }, [comparisonError, router]);

  const schoolIds = comparisonData?.schoolIds ?? [];

  // Fetch full school data for each school ID in parallel
  const schoolQueries = schoolIds.map((schoolId) =>
    trpc.schools.byIdWithFacts.useQuery({ id: schoolId })
  );

  const isLoadingSchools = schoolQueries.some((q) => q.isLoading);
  const schools = schoolQueries
    .map((q) => q.data)
    .filter(
      (data): data is NonNullable<typeof data> =>
        data !== null && data !== undefined && data.school !== null
    )
    .map((data) => ({
      school: data.school,
      facts: data.facts,
      signals: data.signals,
    }));

  if (isLoadingComparison || isLoadingSchools) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Compare Schools</h1>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (
    comparisonError &&
    (comparisonError.data?.code === "UNAUTHORIZED" ||
      comparisonError.message?.includes("UNAUTHORIZED") ||
      comparisonError.message?.includes("Unauthorized"))
  ) {
    // Error handling - redirect should happen in useEffect
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Compare Schools</h1>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Authentication Required</EmptyTitle>
            <EmptyDescription>
              Please sign in to compare schools.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (!comparisonData || schoolIds.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Compare Schools</h1>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No schools to compare</EmptyTitle>
            <EmptyDescription>
              Add schools to your comparison set to see them side-by-side. You
              can compare up to 4 schools at once.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="default" className="mt-4">
            <Link href="/search">Browse Schools</Link>
          </Button>
        </Empty>
      </div>
    );
  }

  if (schoolIds.length < 2) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Compare Schools</h1>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Not enough schools to compare</EmptyTitle>
            <EmptyDescription>
              You need at least 2 schools to compare. Add more schools to your
              comparison set.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="default" className="mt-4">
            <Link href="/search">Browse Schools</Link>
          </Button>
        </Empty>
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Compare Schools</h1>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Schools not found</EmptyTitle>
            <EmptyDescription>
              Some of the schools in your comparison set could not be found.
              They may have been removed.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="default" className="mt-4">
            <Link href="/search">Browse Schools</Link>
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Compare Schools</h1>
      <CompareTable schools={schools} />
    </div>
  );
}
