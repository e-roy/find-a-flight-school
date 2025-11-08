"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ResultsList } from "@/components/marketplace/ResultsList";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SavedPage() {
  const router = useRouter();

  // Fetch saved school IDs
  const {
    data: savedIds,
    isLoading: isLoadingSaved,
    error: savedError,
  } = trpc.marketplace.saved.list.useQuery(undefined, {
    retry: false,
  });

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (savedError && savedError.message.includes("Unauthorized")) {
      const signInUrl = `/sign-in?callbackUrl=${encodeURIComponent("/saved")}`;
      router.push(signInUrl);
    }
  }, [savedError, router]);

  // Fetch full school data for each saved ID in parallel
  const schoolQueries =
    savedIds?.map((schoolId) =>
      trpc.schools.byIdWithFacts.useQuery({ id: schoolId })
    ) ?? [];

  const isLoadingSchools = schoolQueries.some((q) => q.isLoading);
  const schools = schoolQueries
    .map((q) => q.data?.school)
    .filter(
      (school): school is NonNullable<typeof school> =>
        school !== null && school !== undefined
    );

  if (isLoadingSaved || isLoadingSchools) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Saved Schools</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (savedError) {
    // Error handling - redirect should happen in useEffect
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Saved Schools</h1>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Authentication Required</EmptyTitle>
            <EmptyDescription>
              Please sign in to view your saved schools.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (!savedIds || savedIds.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-4">Saved Schools</h1>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No saved schools</EmptyTitle>
            <EmptyDescription>
              Start exploring flight schools and save your favorites to compare
              them later.
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
      <h1 className="text-3xl font-bold mb-6">Saved Schools</h1>
      <ResultsList schools={schools} isLoading={false} />
    </div>
  );
}
