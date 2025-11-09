"use client";

import type { Candidate } from "@/lib/discovery/google";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExistenceStatus {
  existsInSeeds: boolean;
  existsInSchools: boolean;
  matches: Array<{
    type: "seed" | "school";
    id: string;
    name: string;
    domain?: string;
  }>;
}

interface ResultsPanelProps {
  candidates: Candidate[];
  selectedCandidateId?: string;
  onCandidateSelect: (candidate: Candidate) => void;
  existenceStatus?: Map<string, ExistenceStatus>;
  onImport?: (candidate: Candidate) => void;
  importingIds?: Set<string>;
  importedSeedIds?: Map<string, string>; // candidateId -> seedId
  onPromote?: (seedId: string) => void;
  promotingIds?: Set<string>;
}

export function ResultsPanel({
  candidates,
  selectedCandidateId,
  onCandidateSelect,
  existenceStatus,
  onImport,
  importingIds,
  importedSeedIds,
  onPromote,
  promotingIds,
}: ResultsPanelProps) {
  if (candidates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <div className="text-center text-muted-foreground py-8">
          No candidates found. Try adjusting your search parameters.
        </div>
      </div>
    );
  }

  const getCandidateId = (candidate: Candidate): string => {
    return candidate.placeId || `${candidate.lat},${candidate.lng}`;
  };

  const getExistenceBadge = (candidateId: string) => {
    const status = existenceStatus?.get(candidateId);
    if (!status) {
      return (
        <Badge variant="outline" className="text-xs">
          Checking...
        </Badge>
      );
    }

    if (status.existsInSchools) {
      return (
        <Badge variant="destructive" className="text-xs">
          Exists in Schools
        </Badge>
      );
    }

    if (status.existsInSeeds) {
      return (
        <Badge variant="secondary" className="text-xs">
          Exists in Seeds
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
        New
      </Badge>
    );
  };

  return (
    <div className="h-full overflow-auto rounded-lg border bg-background">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Exists?</TableHead>
              {(onImport || onPromote) && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate, index) => {
              const candidateId = getCandidateId(candidate);
              const isSelected = selectedCandidateId === candidateId;
              const status = existenceStatus?.get(candidateId);
              const isImporting = importingIds?.has(candidateId);
              const canImport = status && !status.existsInSchools;
              const seedId = importedSeedIds?.get(candidateId);
              const isImported = !!seedId;
              const isPromoting = seedId ? promotingIds?.has(seedId) : false;
              const canPromote = isImported && status && !status.existsInSchools;

              return (
                <TableRow
                  key={candidateId}
                  className={cn(
                    "transition-colors",
                    isSelected && "bg-primary/10 hover:bg-primary/15",
                    !isSelected && "hover:bg-muted/50"
                  )}
                >
                  <TableCell
                    className="font-medium cursor-pointer"
                    onClick={() => onCandidateSelect(candidate)}
                  >
                    {candidate.name}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer"
                  >
                    {candidate.address || "-"}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer"
                  >
                    {candidate.phone || "-"}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer"
                  >
                    {candidate.website ? (
                      <a
                        href={candidate.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {candidate.website}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="font-mono text-sm cursor-pointer"
                  >
                    {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}
                  </TableCell>
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-default"
                  >
                    {getExistenceBadge(candidateId)}
                  </TableCell>
                  {(onImport || onPromote) && (
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-default"
                    >
                      <div className="flex gap-2">
                        {onImport && !isImported && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canImport || isImporting}
                            onClick={() => onImport(candidate)}
                          >
                            {isImporting ? "Importing..." : "Import"}
                          </Button>
                        )}
                        {onPromote && isImported && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={!canPromote || isPromoting}
                            onClick={() => seedId && onPromote(seedId)}
                          >
                            {isPromoting ? "Promoting..." : "Promote & Queue"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
