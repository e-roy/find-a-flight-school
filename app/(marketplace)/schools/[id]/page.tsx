"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EvidencePanel } from "@/components/schools/EvidencePanel";
import { TierBadge } from "@/components/schools/TierBadge";
import { formatAsOfDate, formatFactValue } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SchoolPage() {
  const params = useParams();
  const id = params.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!id) {
    notFound();
  }

  const { data, isLoading, error } = trpc.schools.byIdWithFacts.useQuery({
    id,
  });

  const handleFinancingIntent = async () => {
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/financing/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit financing intent");
      }

      setSubmitSuccess(true);
      // Close modal after 2 seconds
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error submitting financing intent:", error);
      // TODO(question): Should we show an error message to the user?
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.school) {
    notFound();
  }

  const { school, facts, oldestAsOf, recentlyUpdated, signals } = data;

  // Get key facts for summary (first 3-5 facts)
  const keyFacts = facts.slice(0, 5);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* School Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{school.canonicalName}</h1>
            {recentlyUpdated && (
              <Badge variant="default" className="text-xs">
                Recently updated
              </Badge>
            )}
            {signals && (
              <TierBadge
                velocity={signals.trainingVelocity}
                reliability={signals.scheduleReliability}
                safetyNotes={signals.safetyNotes}
              />
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {school.domain && (
              <div className="flex items-center gap-2">
                <a
                  href={`https://${school.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm underline"
                >
                  {school.domain}
                </a>
              </div>
            )}
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="default"
              size="sm"
            >
              Check financing
            </Button>
          </div>
          {oldestAsOf && (
            <p className="text-muted-foreground text-sm">
              Data as of {formatAsOfDate(oldestAsOf)}
            </p>
          )}
        </div>

        {/* Key Facts Summary */}
        {keyFacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {keyFacts.map((fact) => (
                  <div
                    key={fact.factKey}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {fact.factKey
                          .split(".")
                          .map(
                            (part) =>
                              part.charAt(0).toUpperCase() + part.slice(1)
                          )
                          .join(" ")}
                      </p>
                      <p className="text-sm mt-1">
                        {formatFactValue(fact.factValue)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {fact.provenance}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evidence Panel */}
        <EvidencePanel facts={facts} />
      </div>

      {/* Financing Intent Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Financing Options</DialogTitle>
            <DialogDescription>
              This is a preview flow. We're working on integrating a soft-pull
              credit check that will help you explore financing options for
              flight training at this school. The full integration will be
              available soon.
            </DialogDescription>
          </DialogHeader>
          {submitSuccess ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Thank you! Your interest has been recorded.
              </p>
            </div>
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleFinancingIntent} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

