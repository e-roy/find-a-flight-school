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
import { cn } from "@/lib/utils";

interface ResultsPanelProps {
  candidates: Candidate[];
  selectedCandidateId?: string;
  onCandidateSelect: (candidate: Candidate) => void;
}

export function ResultsPanel({
  candidates,
  selectedCandidateId,
  onCandidateSelect,
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate, index) => {
              const candidateId = getCandidateId(candidate);
              const isSelected = selectedCandidateId === candidateId;

              return (
                <TableRow
                  key={candidateId}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected && "bg-primary/10 hover:bg-primary/15"
                  )}
                  onClick={() => onCandidateSelect(candidate)}
                >
                  <TableCell className="font-medium">
                    {candidate.name}
                  </TableCell>
                  <TableCell>{candidate.address || "-"}</TableCell>
                  <TableCell>{candidate.phone || "-"}</TableCell>
                  <TableCell>
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
                  <TableCell className="font-mono text-sm">
                    {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}
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
