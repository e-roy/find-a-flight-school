"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
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
import { ContactForm } from "@/components/schools/ContactForm";
import { SchoolHero } from "@/components/schools/SchoolHero";
import { ProgramsSection } from "@/components/schools/ProgramsSection";
import { PricingSection } from "@/components/schools/PricingSection";
import { FleetSection } from "@/components/schools/FleetSection";
import { LocationSection } from "@/components/schools/LocationSection";
import { ContactSection } from "@/components/schools/ContactSection";
import { PhotosGallery } from "@/components/schools/PhotosGallery";
import { OpeningHoursSection } from "@/components/schools/OpeningHoursSection";
import { formatAsOfDate } from "@/lib/utils";
import { extractPhotoUrls } from "@/lib/utils-photos";
import { FACT_KEYS } from "@/types";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SchoolPage() {
  const params = useParams();
  const id = params.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // All hooks must be called before any conditional returns
  const { data, isLoading, error } = trpc.schools.byIdWithFacts.useQuery({
    id: id || "",
  });

  // Track profile view on mount
  useEffect(() => {
    if (id) {
      // Log view event (fire and forget)
      fetch("/api/events/view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId: id }),
      }).catch((err) => {
        // Silently fail - view tracking should not block the page
        console.error("Failed to track view:", err);
      });
    }
  }, [id]);

  // Organize facts by category (get latest fact per key)
  // This hook must always run, even if data is not available yet
  const organizedFacts = useMemo(() => {
    if (!data?.facts) {
      return {
        programs: [],
        costBand: undefined,
        costNotes: undefined,
        fleetAircraft: undefined,
        fleetCount: undefined,
        airportCode: undefined,
        address: undefined,
        email: undefined,
        phone: undefined,
        rating: undefined,
        ratingCount: undefined,
        photos: undefined,
      };
    }

    const facts = data.facts;
    const latestFactsByKey = new Map<string, (typeof facts)[0]>();
    for (const fact of facts) {
      if (!latestFactsByKey.has(fact.factKey) || !fact.isStale) {
        latestFactsByKey.set(fact.factKey, fact);
      }
    }

    // Extract facts by category
    const programs: string[] = [];
    const programFacts = Array.from(latestFactsByKey.values()).filter(
      (f) => f.factKey === FACT_KEYS.PROGRAM_TYPE
    );
    for (const fact of programFacts) {
      const value = fact.factValue;
      if (typeof value === "string" && value.length > 0) {
        programs.push(value);
      }
    }

    const costBandFact = latestFactsByKey.get(FACT_KEYS.COST_BAND);
    const costNotesFact = latestFactsByKey.get(FACT_KEYS.COST_NOTES);
    const costBand =
      costBandFact && typeof costBandFact.factValue === "string"
        ? costBandFact.factValue
        : undefined;
    const costNotes =
      costNotesFact && typeof costNotesFact.factValue === "string"
        ? costNotesFact.factValue
        : undefined;

    const fleetAircraftFact = latestFactsByKey.get(FACT_KEYS.FLEET_AIRCRAFT);
    const fleetCountFact = latestFactsByKey.get(FACT_KEYS.FLEET_COUNT);
    const fleetAircraft =
      fleetAircraftFact && Array.isArray(fleetAircraftFact.factValue)
        ? (fleetAircraftFact.factValue as string[])
        : undefined;
    const fleetCount =
      fleetCountFact && typeof fleetCountFact.factValue === "number"
        ? fleetCountFact.factValue
        : undefined;

    const airportCodeFact = latestFactsByKey.get(
      FACT_KEYS.LOCATION_AIRPORT_CODE
    );
    const addressFact = latestFactsByKey.get(FACT_KEYS.LOCATION_ADDRESS);
    const airportCode =
      airportCodeFact && typeof airportCodeFact.factValue === "string"
        ? airportCodeFact.factValue
        : undefined;
    const address =
      addressFact && typeof addressFact.factValue === "string"
        ? addressFact.factValue
        : undefined;

    const emailFact = latestFactsByKey.get(FACT_KEYS.CONTACT_EMAIL);
    const phoneFact = latestFactsByKey.get(FACT_KEYS.CONTACT_PHONE);
    const email =
      emailFact && typeof emailFact.factValue === "string"
        ? emailFact.factValue
        : undefined;
    const phone =
      phoneFact && typeof phoneFact.factValue === "string"
        ? phoneFact.factValue
        : undefined;

    const ratingFact = latestFactsByKey.get(FACT_KEYS.RATING);
    const ratingCountFact = latestFactsByKey.get(FACT_KEYS.RATING_COUNT);
    const rating =
      ratingFact && typeof ratingFact.factValue === "number"
        ? ratingFact.factValue
        : undefined;
    const ratingCount =
      ratingCountFact && typeof ratingCountFact.factValue === "number"
        ? ratingCountFact.factValue
        : undefined;

    const photosFact = latestFactsByKey.get(FACT_KEYS.PHOTOS);
    const photos = photosFact
      ? extractPhotoUrls(photosFact.factValue)
      : undefined;

    const openingHoursFact = latestFactsByKey.get(FACT_KEYS.OPENING_HOURS);
    const openingHours =
      openingHoursFact && typeof openingHoursFact.factValue === "object"
        ? (openingHoursFact.factValue as {
            openNow?: boolean;
            periods?: Array<{
              open: { day: number; hour: number; minute: number };
              close: { day: number; hour: number; minute: number };
            }>;
            weekdayText?: string[];
          })
        : undefined;

    return {
      programs,
      costBand,
      costNotes,
      fleetAircraft,
      fleetCount,
      airportCode,
      address,
      email,
      phone,
      rating,
      ratingCount,
      photos,
      openingHours,
    };
  }, [data?.facts]);

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

  // Now we can do conditional checks and early returns
  if (!id) {
    notFound();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-8 pb-6">
          <Skeleton className="h-64 md:h-80 lg:h-96 w-full rounded-lg" />
        </div>
        <div className="container mx-auto px-4 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.school) {
    notFound();
  }

  const { school, facts, oldestAsOf, recentlyUpdated, signals } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-8 pb-6">
        <SchoolHero
          school={school}
          facts={{
            programs: organizedFacts.programs,
            costBand: organizedFacts.costBand,
            rating: organizedFacts.rating,
            ratingCount: organizedFacts.ratingCount,
            photos: organizedFacts.photos,
          }}
          recentlyUpdated={recentlyUpdated}
          signals={signals || undefined}
          onContactClick={() => {
            // Scroll to contact form
            setTimeout(() => {
              document
                .getElementById("contact-form")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
          onFinancingClick={() => setIsModalOpen(true)}
        />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Data as of notice */}
          {oldestAsOf && (
            <div className="mb-6 text-center">
              <p className="text-muted-foreground text-sm">
                Data as of {formatAsOfDate(oldestAsOf)}
              </p>
            </div>
          )}

          {/* Two-column layout for facts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left column - Main facts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Programs */}
              <ProgramsSection programs={organizedFacts.programs} />

              {/* Pricing */}
              <PricingSection
                costBand={organizedFacts.costBand}
                costNotes={organizedFacts.costNotes}
              />

              {/* Fleet */}
              <FleetSection
                aircraft={organizedFacts.fleetAircraft}
                count={organizedFacts.fleetCount}
              />

              {/* Location */}
              <LocationSection
                school={school}
                airportCode={organizedFacts.airportCode}
                address={organizedFacts.address}
              />

              {/* Opening Hours */}
              {organizedFacts.openingHours && (
                <OpeningHoursSection
                  openNow={organizedFacts.openingHours.openNow}
                  periods={organizedFacts.openingHours.periods}
                  weekdayText={organizedFacts.openingHours.weekdayText}
                />
              )}

              {/* Photos Gallery */}
              {organizedFacts.photos && organizedFacts.photos.length > 0 && (
                <PhotosGallery
                  photos={organizedFacts.photos}
                  schoolName={school.canonicalName}
                />
              )}
            </div>

            {/* Right column - Contact and Evidence */}
            <div className="space-y-6">
              {/* Contact Section */}
              <ContactSection
                school={school}
                email={organizedFacts.email}
                phone={organizedFacts.phone}
              />

              {/* Contact Form */}
              <div id="contact-form">
                <ContactForm schoolId={school.id} />
              </div>

              {/* Evidence Panel */}
              <EvidencePanel facts={facts} />
            </div>
          </div>
        </div>
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
