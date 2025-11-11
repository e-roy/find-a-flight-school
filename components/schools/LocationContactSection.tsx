"use client";

import { FactSection, FactItem } from "./FactSection";
import { MapPin, Mail, Phone, Globe, ExternalLink } from "lucide-react";
import type { schools } from "@/db/schema/schools";
import { GoogleMapEmbed } from "./GoogleMapEmbed";
import { AirportInfo } from "./AirportInfo";

type School = typeof schools.$inferSelect;

interface LocationContactSectionProps {
  school: School;
  airportCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  coordinates?: { lat: number; lng: number } | null;
}

export function LocationContactSection({
  school,
  airportCode,
  address,
  email,
  phone,
  coordinates,
}: LocationContactSectionProps) {
  const addr = school.addrStd;
  let addressParts: string | null = null;

  if (
    addr &&
    typeof addr === "object" &&
    addr !== null &&
    !Array.isArray(addr)
  ) {
    const addrObj = addr as Record<string, unknown>;
    const parts = [addrObj.city, addrObj.state, addrObj.country]
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0
      )
      .join(", ");

    if (parts) {
      addressParts = parts;
    }
  }

  const displayAddress = address || addressParts;

  // Extract coordinates: use prop first, then fallback to school.lat/lng
  const coords =
    coordinates ||
    (school.lat && school.lng ? { lat: school.lat, lng: school.lng } : null);

  const hasLocation = airportCode || displayAddress || coords;
  const hasContact = email || phone || school.domain;
  const hasAnyData = hasLocation || hasContact;

  if (!hasAnyData) {
    return null;
  }

  // Build Google Maps search URL
  const mapQuery = airportCode || displayAddress || school.canonicalName;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapQuery
  )}`;

  return (
    <FactSection
      title="Location & Contact"
      icon={<MapPin className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {/* Location Section */}
        {hasLocation && (
          <div className="space-y-3">
            {/* Google Maps Embed */}
            {coords && (
              <div className="w-full h-64 rounded-lg overflow-hidden border">
                <GoogleMapEmbed
                  lat={coords.lat}
                  lng={coords.lng}
                  schoolName={school.canonicalName}
                />
              </div>
            )}

            {/* Airport Information */}
            {airportCode &&
              airportCode.length >= 3 &&
              airportCode.length <= 4 && (
                <AirportInfo airportCode={airportCode} />
              )}

            {displayAddress && (
              <FactItem
                label="Address"
                value={
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{displayAddress}</span>
                  </div>
                }
              />
            )}
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View on Google Maps
            </a>
          </div>
        )}

        {/* Contact Section */}
        {hasContact && (
          <div className={`space-y-3 ${hasLocation ? "border-t pt-4" : ""}`}>
            {email && (
              <FactItem
                label="Email"
                value={
                  <a
                    href={`mailto:${email}`}
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {email}
                  </a>
                }
              />
            )}
            {phone && (
              <FactItem
                label="Phone"
                value={
                  <a
                    href={`tel:${phone}`}
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    {phone}
                  </a>
                }
              />
            )}
            {school.domain && (
              <FactItem
                label="Website"
                value={
                  <a
                    href={`https://${school.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    {school.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
          </div>
        )}
      </div>
    </FactSection>
  );
}
