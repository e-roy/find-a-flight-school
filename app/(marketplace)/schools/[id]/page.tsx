"use client";

import { useState, useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SchoolProfileView } from "@/components/mk/SchoolProfileView";
import { organizeFactsByCategory } from "@/lib/utils-facts";
import {
  extractFinancingInfo,
  submitFinancingIntent,
} from "@/lib/utils-financing";
import { useTrackView } from "@/hooks/use-track-view";

export default function SchoolPage() {
  const params = useParams();
  const id = params.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data, isLoading, error } = trpc.schools.byIdWithFacts.useQuery({
    id: id || "",
  });

  useTrackView(id);

  const organizedFacts = useMemo(
    () => organizeFactsByCategory(data?.facts),
    [data?.facts]
  );

  const financingInfo = useMemo(
    () => extractFinancingInfo(data?.latestSnapshot),
    [data?.latestSnapshot]
  );

  const handleFinancingIntent = async () => {
    setIsSubmitting(true);
    setSubmitSuccess(false);
    await submitFinancingIntent(id, {
      onSuccess: () => {
        setSubmitSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitSuccess(false);
        }, 2000);
      },
      onFinally: () => setIsSubmitting(false),
    });
  };

  if (!id) notFound();

  if (isLoading) {
    return (
      <div className="mk-shell" style={{ padding: "60px 0" }}>
        <div className="mk-block__note">Loading school…</div>
      </div>
    );
  }

  if (error || !data || !data.school) notFound();

  return (
    <>
      <SchoolProfileView
        school={data.school}
        facts={organizedFacts}
        rawFacts={data.facts}
        signals={data.signals}
        financing={financingInfo}
        snapshot={data.latestSnapshot}
        recentlyUpdated={data.recentlyUpdated}
        claimed={data.claimed}
        onFinancingClick={() => setIsModalOpen(true)}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Financing Options</DialogTitle>
            <DialogDescription>
              {financingInfo?.url ? (
                <>
                  This school has provided financing information on their
                  website. Open it to view their options and application process.
                </>
              ) : (
                <>
                  This is a preview flow. We&apos;re working on integrating a
                  soft-pull credit check to help you explore financing options
                  for flight training at this school.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {submitSuccess ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Thank you! Your interest has been recorded.
              </p>
            </div>
          ) : (
            <>
              {financingInfo?.url && (
                <div className="py-4">
                  <Button
                    className="w-full"
                    onClick={async () => {
                      await handleFinancingIntent();
                      if (financingInfo?.url) {
                        window.open(
                          financingInfo.url,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }
                    }}
                  >
                    Visit School&apos;s Financing Page
                  </Button>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                {!financingInfo?.url && (
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
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
