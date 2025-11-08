"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface Cluster {
  clusterId: string;
  candidates: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    phone: string | null;
    website: string | null;
    confidence: number | null;
  }>;
  bestCandidate: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    phone: string | null;
    website: string | null;
    confidence: number | null;
  };
  mergeReason: string;
}

interface DedupeClusterCardProps {
  cluster: Cluster;
}

export function DedupeClusterCard({ cluster }: DedupeClusterCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const utils = trpc.useUtils();

  const approveMerge = trpc.dedupe.approveMerge.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Merge approved! Created school ${data.schoolId}. ${data.merged} candidates merged.`
      );
      utils.dedupe.getClusters.invalidate();
      setIsApproving(false);
    },
    onError: (error) => {
      toast.error(`Failed to approve merge: ${error.message}`);
      setIsApproving(false);
    },
  });

  const handleApprove = () => {
    setIsApproving(true);
    approveMerge.mutate({ clusterId: cluster.clusterId });
  };

  const mergeReasonLabels: Record<string, string> = {
    phone_match: "Phone Match",
    domain_match: "Domain Match",
    similarity: "Name Similarity",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Cluster ({cluster.candidates.length} candidates)
              <Badge variant="outline">
                {mergeReasonLabels[cluster.mergeReason] || cluster.mergeReason}
              </Badge>
            </CardTitle>
            <CardDescription>
              Best candidate: {cluster.bestCandidate.name}
              {cluster.bestCandidate.city && `, ${cluster.bestCandidate.city}`}
              {cluster.bestCandidate.state && `, ${cluster.bestCandidate.state}`}
            </CardDescription>
          </div>
          <Button
            onClick={handleApprove}
            disabled={isApproving}
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isApproving ? "Approving..." : "Approve Merge"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {cluster.candidates.map((candidate) => {
            const isBest = candidate.id === cluster.bestCandidate.id;
            return (
              <div
                key={candidate.id}
                className={`p-3 rounded-md border ${
                  isBest ? "bg-primary/5 border-primary" : "bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{candidate.name}</span>
                      {isBest && (
                        <Badge variant="default" className="text-xs">
                          Best
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {candidate.city && <span>{candidate.city}</span>}
                      {candidate.city && candidate.state && <span>, </span>}
                      {candidate.state && <span>{candidate.state}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-x-3">
                      {candidate.phone && <span>Phone: {candidate.phone}</span>}
                      {candidate.website && (
                        <span>
                          Website:{" "}
                          <a
                            href={candidate.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {candidate.website}
                          </a>
                        </span>
                      )}
                      {candidate.confidence !== null && (
                        <span>Confidence: {(candidate.confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

