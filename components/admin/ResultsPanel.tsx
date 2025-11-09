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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  selectedCandidateIds?: Set<string>;
  onSelectionChange?: (candidateId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
}

export function ResultsPanel({
  candidates,
  selectedCandidateId,
  onCandidateSelect,
  existenceStatus,
  onImport,
  importingIds,
  importedSeedIds,
  selectedCandidateIds = new Set(),
  onSelectionChange,
  onSelectAll,
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

    if (status.existsInSeeds) {
      return (
        <Badge variant="secondary" className="text-xs">
          Exists in Seeds
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
      >
        New
      </Badge>
    );
  };

  // Get all importable candidate IDs
  const getImportableCandidateIds = (): string[] => {
    return candidates
      .map((candidate) => getCandidateId(candidate))
      .filter((candidateId) => {
        const status = existenceStatus?.get(candidateId);
        return status && !status.existsInSeeds;
      });
  };

  const importableIds = getImportableCandidateIds();
  const allSelected =
    importableIds.length > 0 &&
    importableIds.every((id) => selectedCandidateIds.has(id));

  return (
    <div className="h-full flex flex-col rounded-lg border bg-background overflow-hidden">
      <div className="w-full">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      if (onSelectAll) {
                        onSelectAll(checked === true);
                      }
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Exists?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-y-auto">
            {candidates.map((candidate, index) => {
              const candidateId = getCandidateId(candidate);
              const isSelected = selectedCandidateId === candidateId;
              const status = existenceStatus?.get(candidateId);
              const isImporting = importingIds?.has(candidateId);
              const canImport = status && !status.existsInSeeds;
              const seedId = importedSeedIds?.get(candidateId);
              const isImported = !!seedId;

              return (
                <TableRow
                  key={candidateId}
                  className={cn(
                    "transition-colors",
                    isSelected && "bg-primary/10 hover:bg-primary/15",
                    !isSelected && "hover:bg-muted/50"
                  )}
                >
                  {onSelectionChange && (
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-default"
                    >
                      <Checkbox
                        checked={
                          isImported || selectedCandidateIds.has(candidateId)
                        }
                        onCheckedChange={(checked) => {
                          if (!isImported && canImport) {
                            onSelectionChange(candidateId, checked === true);
                          }
                        }}
                        disabled={isImported || !canImport}
                        aria-label={`Select ${candidate.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell
                    className="font-medium cursor-pointer max-w-[200px] whitespace-normal"
                    onClick={() => onCandidateSelect(candidate)}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate">{candidate.name}</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{candidate.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer max-w-[250px] whitespace-normal"
                  >
                    {candidate.address ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="truncate">{candidate.address}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{candidate.address}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer"
                  >
                    {candidate.phone || "-"}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer max-w-[200px] whitespace-normal"
                  >
                    {candidate.website ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={candidate.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {candidate.website}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{candidate.website}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer"
                  >
                    {candidate.rating !== undefined &&
                    candidate.rating !== null ? (
                      <div className="flex items-center gap-1">
                        <span>{candidate.rating.toFixed(1)}</span>
                        {candidate.userRatingCount && (
                          <span className="text-xs text-muted-foreground">
                            ({candidate.userRatingCount})
                          </span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => onCandidateSelect(candidate)}
                    className="cursor-pointer"
                  >
                    {candidate.businessStatus ? (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          candidate.businessStatus === "OPERATIONAL"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : candidate.businessStatus === "CLOSED_PERMANENTLY"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {candidate.businessStatus.replace(/_/g, " ")}
                      </span>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
