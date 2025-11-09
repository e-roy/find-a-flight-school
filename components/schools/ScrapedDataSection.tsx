"use client";

import { Badge } from "@/components/ui/badge";
import { formatAsOfDate } from "@/lib/utils";
import { FactSection, FactItem } from "./FactSection";

interface ScrapedDataSectionProps {
  snapshot: {
    rawJson: unknown;
    asOf: Date;
    domain: string | null;
    extractConfidence: number | null;
  } | null;
}

export function ScrapedDataSection({ snapshot }: ScrapedDataSectionProps) {
  if (!snapshot || !snapshot.rawJson) {
    return null;
  }

  const data = snapshot.rawJson as Record<string, unknown>;

  // Extract all available fields from the scraped data
  const programs = Array.isArray(data.programs) ? data.programs : [];
  const pricing = Array.isArray(data.pricing) ? data.pricing : [];
  const fleet = Array.isArray(data.fleet) ? data.fleet : [];
  const location = typeof data.location === "string" ? data.location : null;
  const contact = typeof data.contact === "string" ? data.contact : null;
  const email = typeof data.email === "string" ? data.email : null;
  const phone = typeof data.phone === "string" ? data.phone : null;
  const locations = Array.isArray(data.locations) ? data.locations : [];
  const financing = typeof data.financing === "boolean" ? data.financing : null;
  const financingUrl =
    typeof data.financingUrl === "string" ? data.financingUrl : null;
  const financingTypes = Array.isArray(data.financingTypes)
    ? data.financingTypes
    : [];
  const trainingType = Array.isArray(data.trainingType)
    ? data.trainingType
    : [];
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

  const hasData =
    programs.length > 0 ||
    pricing.length > 0 ||
    fleet.length > 0 ||
    location ||
    contact ||
    email ||
    phone ||
    locations.length > 0 ||
    financing !== null ||
    financingUrl ||
    financingTypes.length > 0 ||
    trainingType.length > 0 ||
    simulatorAvailable !== null ||
    instructorCount ||
    typicalTimeline;

  if (!hasData) {
    return null;
  }

  return (
    <FactSection
      title="Scraped Data"
      className="border-2 border-dashed border-blue-300 bg-blue-50/50"
    >
      <div className="space-y-4">
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b">
          <span>Scraped on: {formatAsOfDate(snapshot.asOf)}</span>
          {snapshot.domain && <span>• Domain: {snapshot.domain}</span>}
          {snapshot.extractConfidence !== null && (
            <span>
              • Confidence: {(snapshot.extractConfidence * 100).toFixed(0)}%
            </span>
          )}
          <Badge variant="outline" className="ml-auto">
            Raw Data
          </Badge>
        </div>

        {/* Programs */}
        {programs.length > 0 && (
          <FactItem
            label="Programs"
            value={
              <ul className="list-disc list-inside space-y-1">
                {programs.map((p, i) => (
                  <li key={i} className="text-sm">
                    {String(p)}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {/* Pricing */}
        {pricing.length > 0 && (
          <FactItem
            label="Pricing"
            value={
              <ul className="list-disc list-inside space-y-1">
                {pricing.map((p, i) => (
                  <li key={i} className="text-sm">
                    {String(p)}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {/* Fleet */}
        {fleet.length > 0 && (
          <FactItem
            label="Fleet"
            value={
              <ul className="list-disc list-inside space-y-1">
                {fleet.map((f, i) => (
                  <li key={i} className="text-sm">
                    {String(f)}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {/* Location */}
        {location && (
          <FactItem
            label="Location"
            value={<span className="text-sm">{location}</span>}
          />
        )}

        {/* Multiple Locations */}
        {locations.length > 0 && (
          <FactItem
            label="Locations"
            value={
              <ul className="list-disc list-inside space-y-1">
                {locations.map((loc: any, i: number) => (
                  <li key={i} className="text-sm">
                    {loc.address}
                    {loc.airportCode && ` (${loc.airportCode})`}
                    {loc.city && loc.state && ` - ${loc.city}, ${loc.state}`}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {/* Contact Info */}
        {(contact || email || phone) && (
          <FactItem
            label="Contact"
            value={
              <div className="space-y-1 text-sm">
                {email && <div>Email: {email}</div>}
                {phone && <div>Phone: {phone}</div>}
                {contact && <div>Other: {contact}</div>}
              </div>
            }
          />
        )}

        {/* Training Type */}
        {trainingType.length > 0 && (
          <FactItem
            label="Training Type"
            value={
              <div className="flex flex-wrap gap-2">
                {trainingType.map((t, i) => (
                  <Badge key={i} variant="secondary">
                    {String(t)}
                  </Badge>
                ))}
              </div>
            }
          />
        )}

        {/* Financing */}
        {financing !== null && (
          <FactItem
            label="Financing Available"
            value={
              <div className="space-y-2">
                <Badge variant={financing ? "default" : "secondary"}>
                  {financing ? "Yes" : "No"}
                </Badge>
                {financingUrl && (
                  <div className="text-sm">
                    <a
                      href={financingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Financing URL
                    </a>
                  </div>
                )}
                {financingTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {financingTypes.map((ft, i) => (
                      <Badge key={i} variant="outline">
                        {String(ft)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        )}

        {/* Simulator */}
        {simulatorAvailable !== null && (
          <FactItem
            label="Simulator Available"
            value={
              <Badge variant={simulatorAvailable ? "default" : "secondary"}>
                {simulatorAvailable ? "Yes" : "No"}
              </Badge>
            }
          />
        )}

        {/* Instructor Count */}
        {instructorCount && (
          <FactItem
            label="Instructor Count"
            value={<span className="text-sm">{instructorCount}</span>}
          />
        )}

        {/* Typical Timeline */}
        {typicalTimeline && (
          <FactItem
            label="Typical Timeline"
            value={
              <span className="text-sm">
                {"minMonths" in typicalTimeline &&
                "maxMonths" in typicalTimeline &&
                typicalTimeline.minMonths &&
                typicalTimeline.maxMonths
                  ? `${typicalTimeline.minMonths}-${typicalTimeline.maxMonths} months`
                  : "minMonths" in typicalTimeline && typicalTimeline.minMonths
                  ? `${typicalTimeline.minMonths}+ months`
                  : "maxMonths" in typicalTimeline && typicalTimeline.maxMonths
                  ? `Up to ${typicalTimeline.maxMonths} months`
                  : "Not specified"}
              </span>
            }
          />
        )}
      </div>
    </FactSection>
  );
}
