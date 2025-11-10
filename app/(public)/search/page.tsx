"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { z } from "zod";
import type { MatchRequest } from "@/lib/validation";
import { SearchFilters } from "@/components/marketplace/SearchFilters";
import { ResultsList } from "@/components/marketplace/ResultsList";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";

// Schema for parsing URL search params (all values come as strings)
const SearchParamsSchema = z.object({
  aircraft: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(",").filter(Boolean);
    }),
  radiusKm: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }),
  city: z.string().optional(),
  financingAvailable: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val === "true";
    }),
});

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse URL params to filter state
  const urlFilters = useMemo(() => {
    const params: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const parsed = SearchParamsSchema.safeParse(params);
    if (!parsed.success) {
      return {};
    }

    const result: Partial<MatchRequest> = {
      radiusKm: parsed.data.radiusKm ?? 100,
    };

    if (parsed.data.city) {
      result.city = parsed.data.city;
    }

    if (parsed.data.aircraft && parsed.data.aircraft.length > 0) {
      result.aircraft = parsed.data.aircraft;
    }

    if (parsed.data.financingAvailable !== undefined) {
      result.financingAvailable = parsed.data.financingAvailable;
    }

    return result;
  }, [searchParams]);

  // Build query input from filters
  const queryInput = useMemo(() => {
    const input: Partial<MatchRequest> & { limit?: number; offset?: number } = {
      ...urlFilters,
      limit: 50,
      offset: 0,
    };
    return Object.keys(input).length > 0 ? input : undefined;
  }, [urlFilters]);

  // Fetch search results
  const { data: schools, isLoading } =
    trpc.marketplace.search.query.useQuery(queryInput);

  // Update URL when filters change
  const handleFiltersChange = (newFilters: Partial<MatchRequest>) => {
    const params = new URLSearchParams();

    if (newFilters.aircraft && newFilters.aircraft.length > 0) {
      params.set("aircraft", newFilters.aircraft.join(","));
    }

    if (newFilters.radiusKm !== undefined && newFilters.radiusKm !== 100) {
      params.set("radiusKm", newFilters.radiusKm.toString());
    }

    if (newFilters.city) {
      params.set("city", newFilters.city);
    }

    if (newFilters.financingAvailable) {
      params.set("financingAvailable", "true");
    }

    const queryString = params.toString();
    router.push(`/search${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search Flight Schools</h1>
        <p className="text-muted-foreground">
          Use the filters below to find flight schools that match your
          preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <SearchFilters
                filters={urlFilters}
                onFiltersChange={handleFiltersChange}
              />
            </CardContent>
          </Card>

          <div className="my-4 text-sm text-muted-foreground">
            {isLoading
              ? "Searching..."
              : schools
              ? `Found ${schools.length} ${
                  schools.length === 1 ? "school" : "schools"
                }`
              : "No results"}
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3">
          <ResultsList schools={schools} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Search Flight Schools</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
