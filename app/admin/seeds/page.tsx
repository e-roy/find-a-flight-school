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
import { SeedSearchInput } from "@/components/admin/SeedSearchInput";
import { SeedResolverButton } from "@/components/admin/SeedResolverButton";
import { toast } from "sonner";
import Link from "next/link";

export default function SeedsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());

  const { data: seeds, isLoading } = trpc.seeds.list.useQuery(
    { limit: 100 },
    { enabled: !searchQuery }
  );

  const { data: searchResults, isLoading: isSearching } = trpc.seeds.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  const utils = trpc.useUtils();

  const promoteMutation = trpc.seeds.promoteAndQueue.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Successfully promoted and queued${result.queueId ? " (crawl enqueued)" : ""}`
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Seed Candidates</h2>
          <p className="text-muted-foreground">
            Manage and resolve seed candidates
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/seed-upload">Upload Seeds</Link>
        </Button>
      </div>

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
              <SeedSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Country</TableHead>
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
                      colSpan={9}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : !displaySeeds || displaySeeds.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-8"
                    >
                      {searchQuery
                        ? "No seed candidates found matching your search."
                        : "No seed candidates found. Upload a CSV file to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displaySeeds.map((seed) => (
                    <TableRow key={seed.id}>
                      <TableCell className="font-medium">{seed.name}</TableCell>
                      <TableCell>{seed.city || "-"}</TableCell>
                      <TableCell>{seed.state || "-"}</TableCell>
                      <TableCell>{seed.country || "-"}</TableCell>
                      <TableCell>{seed.phone || "-"}</TableCell>
                      <TableCell>
                        {seed.website ? (
                          <a
                            href={seed.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {seed.website}
                          </a>
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
                        <div className="flex gap-2">
                          <SeedResolverButton seedId={seed.id} />
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
