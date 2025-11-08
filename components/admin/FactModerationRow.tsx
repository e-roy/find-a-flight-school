"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface Fact {
  schoolId: string;
  factKey: string;
  factValue: unknown;
  provenance: string;
  asOf: Date;
  createdAt: Date;
}

interface FactModerationRowProps {
  fact: Fact;
  schoolName?: string;
}

export function FactModerationRow({ fact, schoolName }: FactModerationRowProps) {
  const [isModerating, setIsModerating] = useState(false);
  const utils = trpc.useUtils();

  const moderate = trpc.facts.moderate.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        `Fact ${variables.status === "APPROVED" ? "approved" : "rejected"} successfully`
      );
      utils.facts.listPending.invalidate();
      setIsModerating(false);
    },
    onError: (error) => {
      toast.error(`Failed to moderate fact: ${error.message}`);
      setIsModerating(false);
    },
  });

  const handleApprove = () => {
    setIsModerating(true);
    moderate.mutate({
      schoolId: fact.schoolId,
      factKey: fact.factKey,
      asOf: fact.asOf.toISOString(),
      status: "APPROVED",
    });
  };

  const handleReject = () => {
    setIsModerating(true);
    moderate.mutate({
      schoolId: fact.schoolId,
      factKey: fact.factKey,
      asOf: fact.asOf.toISOString(),
      status: "REJECTED",
    });
  };

  return (
    <tr>
      <td className="font-medium">
        <Link
          href={`/schools/${fact.schoolId}`}
          className="text-primary hover:underline"
        >
          {schoolName || fact.schoolId}
        </Link>
      </td>
      <td>
        <Badge variant="outline">{fact.factKey}</Badge>
      </td>
      <td className="max-w-xs truncate">
        {typeof fact.factValue === "string"
          ? fact.factValue
          : JSON.stringify(fact.factValue)}
      </td>
      <td className="text-sm text-muted-foreground">{fact.provenance}</td>
      <td className="text-sm text-muted-foreground">
        {new Date(fact.asOf).toLocaleDateString()}
      </td>
      <td>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApprove}
            disabled={isModerating}
            className="text-green-600"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isModerating}
            className="text-red-600"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </td>
    </tr>
  );
}

