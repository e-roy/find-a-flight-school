"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FACT_KEYS, PROGRAM_TYPES, COST_BANDS } from "@/types";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [fleetAircraft, setFleetAircraft] = useState<string>("");
  const [fleetCount, setFleetCount] = useState<string>("");
  const [costBand, setCostBand] = useState<string>("");

  const { data: profileData, isLoading } = trpc.portal.profile.get.useQuery();
  const proposeFactsMutation = trpc.portal.profile.proposeFacts.useMutation({
    onSuccess: () => {
      setSubmitStatus("success");
    },
    onError: (error) => {
      setSubmitStatus("error");
      setErrorMessage(error.message || "Failed to submit edits");
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Pre-populate form with existing approved facts
  useEffect(() => {
    if (profileData?.facts) {
      const programs: string[] = [];
      for (const fact of profileData.facts) {
        if (
          fact.factKey === FACT_KEYS.CONTACT_EMAIL &&
          typeof fact.factValue === "string"
        ) {
          setContactEmail(fact.factValue);
        }
        if (
          fact.factKey === FACT_KEYS.CONTACT_PHONE &&
          typeof fact.factValue === "string"
        ) {
          setContactPhone(fact.factValue);
        }
        if (
          fact.factKey === FACT_KEYS.PROGRAM_TYPE &&
          typeof fact.factValue === "string"
        ) {
          programs.push(fact.factValue);
        }
        if (
          fact.factKey === FACT_KEYS.FLEET_AIRCRAFT &&
          Array.isArray(fact.factValue)
        ) {
          setFleetAircraft(fact.factValue.join(", "));
        }
        if (
          fact.factKey === FACT_KEYS.FLEET_COUNT &&
          typeof fact.factValue === "number"
        ) {
          setFleetCount(fact.factValue.toString());
        }
        if (
          fact.factKey === FACT_KEYS.COST_BAND &&
          typeof fact.factValue === "string"
        ) {
          setCostBand(fact.factValue);
        }
      }
      if (programs.length > 0) {
        setSelectedPrograms([...new Set(programs)]);
      }
    }
  }, [profileData]);

  const handleProgramToggle = (program: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(program)
        ? prev.filter((p) => p !== program)
        : [...prev, program]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    const facts: Array<{
      factKey: string;
      factValue: string | number | string[] | null;
    }> = [];

    if (contactEmail) {
      facts.push({
        factKey: FACT_KEYS.CONTACT_EMAIL,
        factValue: contactEmail,
      });
    }

    if (contactPhone) {
      facts.push({
        factKey: FACT_KEYS.CONTACT_PHONE,
        factValue: contactPhone,
      });
    }

    if (selectedPrograms.length > 0) {
      // Submit each program as a separate fact (matching normalize.ts behavior)
      for (const program of selectedPrograms) {
        facts.push({
          factKey: FACT_KEYS.PROGRAM_TYPE,
          factValue: program,
        });
      }
    }

    if (fleetAircraft) {
      const aircraftList = fleetAircraft
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      if (aircraftList.length > 0) {
        facts.push({
          factKey: FACT_KEYS.FLEET_AIRCRAFT,
          factValue: aircraftList,
        });
      }
    }

    if (fleetCount) {
      const count = parseInt(fleetCount, 10);
      if (!isNaN(count)) {
        facts.push({
          factKey: FACT_KEYS.FLEET_COUNT,
          factValue: count,
        });
      }
    }

    if (costBand) {
      facts.push({
        factKey: FACT_KEYS.COST_BAND,
        factValue: costBand,
      });
    }

    if (facts.length === 0) {
      setSubmitStatus("error");
      setErrorMessage("Please fill in at least one field");
      setIsSubmitting(false);
      return;
    }

    try {
      await proposeFactsMutation.mutateAsync({ facts });
    } catch (error) {
      // Error handled by mutation callbacks
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileData?.school) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>School profile not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Edit Profile</h2>
        <p className="text-muted-foreground">
          Update your school information. Changes will be submitted for
          moderation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{profileData.school.canonicalName}</CardTitle>
          <CardDescription>
            Update your school profile. All changes require admin approval
            before being published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitStatus === "success" ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your edits have been submitted for moderation. They will be
                  reviewed and published soon.
                </p>
              </div>
              <Button
                onClick={() => {
                  setSubmitStatus("idle");
                }}
                variant="outline"
              >
                Make More Changes
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contact@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Programs */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Programs Offered</h3>
                <div className="space-y-2">
                  {Object.values(PROGRAM_TYPES).map((program) => (
                    <div key={program} className="flex items-center space-x-2">
                      <Checkbox
                        id={`program-${program}`}
                        checked={selectedPrograms.includes(program)}
                        onCheckedChange={() => handleProgramToggle(program)}
                      />
                      <Label
                        htmlFor={`program-${program}`}
                        className="font-normal cursor-pointer"
                      >
                        {program}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fleet */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Fleet</h3>
                <div className="space-y-2">
                  <Label htmlFor="fleetAircraft">
                    Aircraft Types (comma-separated)
                  </Label>
                  <Input
                    id="fleetAircraft"
                    placeholder="Cessna 172, Piper PA-28"
                    value={fleetAircraft}
                    onChange={(e) => setFleetAircraft(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fleetCount">Total Aircraft Count</Label>
                  <Input
                    id="fleetCount"
                    type="number"
                    min="0"
                    placeholder="10"
                    value={fleetCount}
                    onChange={(e) => setFleetCount(e.target.value)}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing</h3>
                <div className="space-y-2">
                  <Label htmlFor="costBand">Cost Band</Label>
                  <Select value={costBand} onValueChange={setCostBand}>
                    <SelectTrigger id="costBand" className="w-full">
                      <SelectValue placeholder="Select cost band" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={COST_BANDS.LOW}>Low</SelectItem>
                      <SelectItem value={COST_BANDS.MID}>Mid</SelectItem>
                      <SelectItem value={COST_BANDS.HIGH}>High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {submitStatus === "error" && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {errorMessage}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for Moderation"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
