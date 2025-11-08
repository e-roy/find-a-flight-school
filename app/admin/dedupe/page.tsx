"use client";

import { trpc } from "@/lib/trpc/client";
import { DedupeClusterCard } from "@/components/admin/DedupeClusterCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DedupePage() {
  const { data: clusters, isLoading } = trpc.dedupe.getClusters.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Deduplication</h2>
        <p className="text-muted-foreground">
          Review and approve candidate clusters for merging
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading clusters...</div>
          </CardContent>
        </Card>
      ) : !clusters || clusters.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Clusters Found</CardTitle>
            <CardDescription>
              No candidate clusters found. All candidates may have been processed or there are no duplicates.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <DedupeClusterCard key={cluster.clusterId} cluster={cluster} />
          ))}
        </div>
      )}
    </div>
  );
}

