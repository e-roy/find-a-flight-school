"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function PublicAdditionsView() {
  const { data, isLoading, refetch } = trpc.seeds.listPublicAdditions.useQuery({
    limit: 100,
  });

  const removeMutation = trpc.seeds.removeSchool.useMutation({
    onSuccess: () => {
      toast.success("School removed");
      refetch();
    },
    onError: (error) => toast.error(`Failed to remove: ${error.message}`),
  });

  const refreshPhotos = trpc.seeds.refreshStalePhotos.useMutation({
    onSuccess: (r) =>
      toast.success(
        `Refreshed ${r.refreshed}/${r.candidates} schools — ${r.budgetRemaining} budget left this month`
      ),
    onError: (error) => toast.error(`Refresh failed: ${error.message}`),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Photo maintenance</CardTitle>
          <CardDescription>
            Re-fetch stale or broken Google Places photos. Budget-capped, so it
            stays within the free tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => refreshPhotos.mutate(undefined)}
            disabled={refreshPhotos.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {refreshPhotos.isPending
              ? "Refreshing…"
              : "Refresh stale photos now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Added by the public</CardTitle>
          <CardDescription>
            Schools submitted through the public add-a-school page. Remove any
            that are off-topic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No public submissions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.domain || "-"}</TableCell>
                    <TableCell>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/schools/${s.id}`}
                          target="_blank"
                          className="text-sm underline"
                        >
                          View
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={removeMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove "${s.name}"? This deletes the school and all its data.`
                              )
                            ) {
                              removeMutation.mutate({ schoolId: s.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
