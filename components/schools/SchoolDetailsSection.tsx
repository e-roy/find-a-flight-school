"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap,
  Clock,
  Users,
  Plane,
  CreditCard,
  Monitor,
  CheckCircle2,
  XCircle,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FactItem } from "./FactSection";

interface SchoolDetailsSectionProps {
  snapshot: {
    rawJson: unknown;
    asOf: Date;
  } | null;
}

export function SchoolDetailsSection({ snapshot }: SchoolDetailsSectionProps) {
  if (!snapshot || !snapshot.rawJson) {
    return null;
  }

  const data = snapshot.rawJson as Record<string, unknown>;

  // Extract relevant data
  const programs = Array.isArray(data.programs) ? data.programs : [];
  const trainingType = Array.isArray(data.trainingType)
    ? data.trainingType
    : [];
  const fleet = Array.isArray(data.fleet) ? data.fleet : [];
  const locations = Array.isArray(data.locations) ? data.locations : [];
  const simulatorAvailable =
    typeof data.simulatorAvailable === "boolean"
      ? data.simulatorAvailable
      : null;
  const instructorCount =
    typeof data.instructorCount === "string" ? data.instructorCount : null;
  const typicalTimeline =
    typeof data.typicalTimeline === "object" && data.typicalTimeline !== null
      ? data.typicalTimeline
      : null;
  const financing = typeof data.financing === "boolean" ? data.financing : null;
  const financingTypes = Array.isArray(data.financingTypes)
    ? data.financingTypes
    : [];

  // Check if we have any meaningful data to display
  const hasData =
    programs.length > 0 ||
    trainingType.length > 0 ||
    fleet.length > 0 ||
    locations.length > 0 ||
    simulatorAvailable !== null ||
    instructorCount ||
    typicalTimeline ||
    financing !== null;

  if (!hasData) {
    return null;
  }

  // Format timeline
  const formatTimeline = () => {
    if (!typicalTimeline) return null;
    if (
      "minMonths" in typicalTimeline &&
      "maxMonths" in typicalTimeline &&
      typicalTimeline.minMonths &&
      typicalTimeline.maxMonths
    ) {
      return `${typicalTimeline.minMonths}-${typicalTimeline.maxMonths} months`;
    }
    if ("minMonths" in typicalTimeline && typicalTimeline.minMonths) {
      return `${typicalTimeline.minMonths}+ months`;
    }
    if ("maxMonths" in typicalTimeline && typicalTimeline.maxMonths) {
      return `Up to ${typicalTimeline.maxMonths} months`;
    }
    return null;
  };

  const timelineText = formatTimeline();

  // Determine if we need separate cards or can combine
  const hasTrainingInfo =
    programs.length > 0 ||
    trainingType.length > 0 ||
    timelineText ||
    fleet.length > 0;
  const hasResourcesInfo =
    instructorCount ||
    simulatorAvailable !== null ||
    financing !== null ||
    locations.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Training Information Card */}
        {hasTrainingInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Training Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {programs.length > 0 && (
                <FactItem
                  label="Programs"
                  value={
                    <div className="flex flex-wrap gap-2">
                      {programs.map((program, i) => (
                        <Badge key={i} variant="secondary" className="text-sm">
                          {String(program)}
                        </Badge>
                      ))}
                    </div>
                  }
                />
              )}

              {trainingType.length > 0 && (
                <FactItem
                  label="Training Format"
                  value={
                    <div className="flex flex-wrap gap-2">
                      {trainingType.map((type, i) => (
                        <Badge key={i} variant="outline" className="text-sm">
                          {String(type)}
                        </Badge>
                      ))}
                    </div>
                  }
                />
              )}

              {timelineText && (
                <FactItem
                  label="Typical Timeline"
                  value={
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {timelineText}
                      </span>
                    </div>
                  }
                />
              )}

              {fleet.length > 0 && (
                <FactItem
                  label="Fleet"
                  value={
                    <div className="space-y-1">
                      {fleet.map((aircraft, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Plane className="h-3 w-3 text-muted-foreground" />
                          <span>{String(aircraft)}</span>
                        </div>
                      ))}
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* School Resources Card */}
        {hasResourcesInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                School Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {financing !== null && (
                <FactItem
                  label="Financing Available"
                  value={
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {financing ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-base font-semibold text-green-600">
                              Yes, Financing Available
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <span className="text-base font-semibold text-red-600 dark:text-red-400">
                              No, Financing Not Available
                            </span>
                          </>
                        )}
                      </div>
                      {financing && financingTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                          <span className="text-xs font-medium text-muted-foreground w-full">
                            Financing Types:
                          </span>
                          {financingTypes.map((type, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {String(type)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  }
                />
              )}

              {instructorCount && (
                <FactItem
                  label="Instructors"
                  value={
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {instructorCount}
                      </span>
                    </div>
                  }
                />
              )}

              {simulatorAvailable !== null && (
                <FactItem
                  label="Flight Simulator"
                  value={
                    <div className="flex items-center gap-2">
                      {simulatorAvailable ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            Available
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Not Available
                          </span>
                        </>
                      )}
                    </div>
                  }
                />
              )}

              {locations.length > 0 && (
                <FactItem
                  label="Locations"
                  value={
                    <div className="space-y-2">
                      {locations.map((loc: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            {loc.address && <div>{loc.address}</div>}
                            {loc.airportCode && (
                              <div className="text-muted-foreground font-mono text-xs">
                                {loc.airportCode}
                              </div>
                            )}
                            {loc.city && loc.state && (
                              <div className="text-muted-foreground text-xs">
                                {loc.city}, {loc.state}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
