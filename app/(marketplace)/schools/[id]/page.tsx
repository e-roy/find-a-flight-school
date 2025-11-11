"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { SchoolHero } from "@/components/schools/SchoolHero";
import { ProgramsSection } from "@/components/schools/ProgramsSection";
import { PricingSection } from "@/components/schools/PricingSection";
import { FleetSection } from "@/components/schools/FleetSection";
import { LocationContactSection } from "@/components/schools/LocationContactSection";
import { SchoolDetailsSection } from "@/components/schools/SchoolDetailsSection";
import { PhotosGallery } from "@/components/schools/PhotosGallery";
import { OpeningHoursSection } from "@/components/schools/OpeningHoursSection";
import { ScrapedDataSection } from "@/components/schools/ScrapedDataSection";

import { organizeFactsByCategory } from "@/lib/utils-facts";
import {
  extractFinancingInfo,
  submitFinancingIntent,
} from "@/lib/utils-financing";
import { useTrackView } from "@/hooks/use-track-view";
import { notFound } from "next/navigation";
import {
  Loader2,
  GraduationCap,
  DollarSign,
  Plane,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  // Get current user's role to check if admin
  const { data: roleData } = trpc.schools.currentUserRole.useQuery();

  // Track profile view on mount
  useTrackView(id);

  // Organize facts by category (get latest fact per key)
  // This hook must always run, even if data is not available yet
  const organizedFacts = useMemo(
    () => organizeFactsByCategory(data?.facts),
    [data?.facts]
  );

  // Extract financing info from snapshot
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
        // Close modal after 2 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitSuccess(false);
        }, 2000);
      },
      onError: () => {
        // Error is already logged in submitFinancingIntent
        // TODO(question): Should we show an error message to the user?
      },
      onFinally: () => {
        setIsSubmitting(false);
      },
    });
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="space-y-4">
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

  const {
    school,
    facts,
    oldestAsOf,
    recentlyUpdated,
    signals,
    latestSnapshot,
  } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Link href="/search">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pb-12">
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
          onFinancingClick={
            financingInfo?.available ? () => setIsModalOpen(true) : undefined
          }
        />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Two-column layout for facts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column - Main facts */}
            <div className="lg:col-span-2">
              {/* Quick Facts Grid - Show key info at a glance */}
              {(organizedFacts.programs.length > 0 ||
                organizedFacts.costBand ||
                organizedFacts.fleetAircraft?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {organizedFacts.programs.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          Programs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {organizedFacts.programs
                            .slice(0, 3)
                            .map((program) => (
                              <Badge
                                key={program}
                                variant="secondary"
                                className="text-xs"
                              >
                                {program}
                              </Badge>
                            ))}
                          {organizedFacts.programs.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{organizedFacts.programs.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {organizedFacts.costBand && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Pricing
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge
                          variant={
                            organizedFacts.costBand === "LOW"
                              ? "default"
                              : organizedFacts.costBand === "MID"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-sm"
                        >
                          {organizedFacts.costBand}
                        </Badge>
                        {organizedFacts.costNotes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {organizedFacts.costNotes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {organizedFacts.fleetAircraft?.length && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          Fleet
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {organizedFacts.fleetAircraft
                            .slice(0, 2)
                            .map((aircraft, i) => (
                              <span key={i} className="text-sm">
                                {aircraft}
                              </span>
                            ))}
                          {organizedFacts.fleetAircraft.length > 2 && (
                            <span className="text-sm text-muted-foreground">
                              +{organizedFacts.fleetAircraft.length - 2} more
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Detailed Information Sections */}
              <div className="space-y-4">
                {/* Programs - Full List */}
                {organizedFacts.programs.length > 0 && (
                  <ProgramsSection programs={organizedFacts.programs} />
                )}

                {/* Pricing - Full Details */}
                {(organizedFacts.costBand || organizedFacts.costNotes) && (
                  <PricingSection
                    costBand={organizedFacts.costBand}
                    costNotes={organizedFacts.costNotes}
                  />
                )}

                {/* Fleet - Full Details */}
                {(organizedFacts.fleetAircraft?.length ||
                  organizedFacts.fleetCount) && (
                  <FleetSection
                    aircraft={organizedFacts.fleetAircraft}
                    count={organizedFacts.fleetCount}
                  />
                )}
              </div>
              <div className="space-y-4">
                {/* School Details from Scraped Data */}
                {latestSnapshot && (
                  <SchoolDetailsSection snapshot={latestSnapshot} />
                )}

                {/* Media & Additional Data */}

                {organizedFacts.photos && organizedFacts.photos.length > 0 && (
                  <PhotosGallery
                    photos={organizedFacts.photos}
                    schoolName={school.canonicalName}
                  />
                )}

                {latestSnapshot && roleData?.role === "admin" && (
                  <ScrapedDataSection snapshot={latestSnapshot} />
                )}
              </div>
            </div>

            {/* Right column - Location, Contact, Hours, and Evidence */}
            <div className="space-y-4">
              <LocationContactSection
                school={school}
                airportCode={organizedFacts.airportCode}
                address={organizedFacts.address}
                email={organizedFacts.email}
                phone={organizedFacts.phone}
                coordinates={
                  organizedFacts.coordinates ||
                  (school.lat && school.lng
                    ? { lat: school.lat, lng: school.lng }
                    : null)
                }
              />

              {organizedFacts.openingHours && (
                <OpeningHoursSection
                  openNow={organizedFacts.openingHours.openNow}
                  periods={organizedFacts.openingHours.periods}
                  weekdayText={organizedFacts.openingHours.weekdayText}
                />
              )}

              {/* <div id="contact-form">
                <ContactForm schoolId={school.id} />
              </div> */}

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
              {financingInfo?.url ? (
                <>
                  This school has provided financing information on their
                  website. Click the link below to view their financing options
                  and application process.
                </>
              ) : (
                <>
                  This is a preview flow. We&apos;re working on integrating a
                  soft-pull credit check that will help you explore financing
                  options for flight training at this school. The full
                  integration will be available soon.
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
                      // Track intent when user clicks the link
                      await handleFinancingIntent();
                      // Open the financing URL in a new window
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
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This link opens the school&apos;s financing page in a new
                    window.
                  </p>
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
                  <Button
                    onClick={handleFinancingIntent}
                    disabled={isSubmitting}
                  >
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
    </div>
  );
}
