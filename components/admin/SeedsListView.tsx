"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SeedSearchInput } from "@/components/admin/SeedSearchInput";
import { toast } from "sonner";

export function SeedsListView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());

  const { data: seeds, isLoading } = trpc.seeds.list.useQuery(
    { limit: 100 },
    { enabled: !searchQuery }
  );

  const { data: searchResults, isLoading: isSearching } =
    trpc.seeds.search.useQuery(
      { query: searchQuery },
      { enabled: searchQuery.length > 0 }
    );

  const utils = trpc.useUtils();

  const promoteMutation = trpc.seeds.promoteAndQueue.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Successfully promoted and queued${
          result.queueId ? " (crawl enqueued)" : ""
        }`
      );
      // Refresh the list
      utils.seeds.list.invalidate();
      if (searchQuery) {
        utils.seeds.search.invalidate();
      }
    },
    onError: (error) => {
      toast.error(`Failed to promote: ${error.message}`);
    },
    onSettled: (_, __, variables) => {
      setPromotingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.seedId);
        return next;
      });
    },
  });

  const handlePromote = (seedId: string) => {
    setPromotingIds((prev) => new Set(prev).add(seedId));
    promoteMutation.mutate({ seedId });
  };

  const displaySeeds = searchQuery ? searchResults : seeds;
  const isLoadingData = searchQuery ? isSearching : isLoading;

  // Helper to get Google Places data - reads from database columns first, falls back to evidenceJson for backward compatibility
  const getGoogleData = (seed: NonNullable<typeof displaySeeds>[0]) => {
    // If database columns have data, use them (new imports)
    if (
      seed.rating !== null ||
      seed.businessStatus ||
      seed.userRatingCount !== null
    ) {
      return {
        rating: seed.rating ?? undefined,
        userRatingCount: seed.userRatingCount ?? undefined,
        businessStatus: seed.businessStatus ?? undefined,
        priceLevel: seed.priceLevel ?? undefined,
        photos: seed.photos ?? undefined,
        regularOpeningHours: seed.regularOpeningHours ?? undefined,
        currentOpeningHours: seed.currentOpeningHours ?? undefined,
      };
    }

    // Fallback to evidenceJson for old data (backward compatibility)
    if (seed.evidenceJson && typeof seed.evidenceJson === "object") {
      const evidence = seed.evidenceJson as any;
      if (evidence.provider === "PLACES" && evidence.candidate) {
        return evidence.candidate;
      }
    }
    return null;
  };

  // Helper to format address from seed data
  const formatAddress = (seed: NonNullable<typeof displaySeeds>[0]): string => {
    // Try to get formatted address from evidenceJson first
    const googleData = getGoogleData(seed);
    if (
      googleData &&
      typeof googleData === "object" &&
      "address" in googleData
    ) {
      return (googleData as any).address || "";
    }

    // Fallback to constructing from components
    const parts: string[] = [];
    if (seed.streetAddress) {
      parts.push(seed.streetAddress);
    }
    if (seed.city) {
      parts.push(seed.city);
    }
    if (seed.state) {
      parts.push(seed.state);
    }
    if (seed.postalCode) {
      parts.push(seed.postalCode);
    }
    return parts.length > 0 ? parts.join(", ") : "";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Seed List</CardTitle>
            <CardDescription>
              {isLoadingData
                ? "Loading..."
                : `${displaySeeds?.length ?? 0} rows`}
            </CardDescription>
          </div>
          <div className="w-64">
            <SeedSearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingData ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !displaySeeds || displaySeeds.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchQuery
                      ? "No seed candidates found matching your search."
                      : "No seed candidates found. Upload a CSV file to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                displaySeeds.map((seed) => {
                  const googleData = getGoogleData(seed);
                  const address = formatAddress(seed);
                  return (
                    <TableRow key={seed.id}>
                      <TableCell className="font-medium max-w-[200px] whitespace-normal">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate">{seed.name}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{seed.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="max-w-[250px] whitespace-normal">
                        {address ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate">{address}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{address}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{seed.city || "-"}</TableCell>
                      <TableCell>{seed.state || "-"}</TableCell>
                      <TableCell>{seed.country || "-"}</TableCell>
                      <TableCell>
                        {googleData?.rating !== undefined &&
                        googleData.rating !== null ? (
                          <div className="flex items-center gap-1">
                            <span>{googleData.rating.toFixed(1)}</span>
                            {googleData.userRatingCount && (
                              <span className="text-xs text-muted-foreground">
                                ({googleData.userRatingCount})
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {googleData?.businessStatus ? (
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              googleData.businessStatus === "OPERATIONAL"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : googleData.businessStatus ===
                                  "CLOSED_PERMANENTLY"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {googleData.businessStatus.replace(/_/g, " ")}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{seed.phone || "-"}</TableCell>
                      <TableCell className="max-w-[200px] whitespace-normal">
                        {seed.website ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={seed.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate block"
                              >
                                {seed.website}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{seed.website}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {seed.confidence !== null
                          ? seed.confidence.toFixed(1)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {seed.createdAt
                          ? new Date(seed.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {seed.website && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={promotingIds.has(seed.id)}
                            onClick={() => handlePromote(seed.id)}
                          >
                            {promotingIds.has(seed.id)
                              ? "Promoting..."
                              : "Promote & Queue"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
