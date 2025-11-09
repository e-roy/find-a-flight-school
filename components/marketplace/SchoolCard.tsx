"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SaveButton } from "@/components/marketplace/SaveButton";
import { MapPin, Globe, Star, DollarSign, Plane } from "lucide-react";
import { getPhotoUrl } from "@/lib/utils-photos";
import type { schools } from "@/db/schema/schools";

type School = typeof schools.$inferSelect;

interface SchoolCardProps {
  school: School & {
    facts?: {
      programs?: string[];
      costBand?: string;
      fleetAircraft?: string[];
      rating?: number;
      ratingCount?: number;
      photos?: (string | { name: string })[];
    };
  };
}

function getImageUrl(school: SchoolCardProps["school"]): string | null {
  // 1. Try photos fact (first photo if array exists)
  if (
    school.facts?.photos &&
    Array.isArray(school.facts.photos) &&
    school.facts.photos.length > 0
  ) {
    const firstPhoto = school.facts.photos[0];
    const photoUrl = getPhotoUrl(firstPhoto);
    if (photoUrl) {
      return photoUrl;
    }
  }

  // 2. Try domain-based favicon
  if (school.domain) {
    const domain = school.domain.startsWith("http")
      ? new URL(school.domain).hostname
      : school.domain.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  // 3. Return null for placeholder
  return null;
}

export function SchoolCard({ school }: SchoolCardProps) {
  const imageUrl = getImageUrl(school);
  const [imageError, setImageError] = useState(false);
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

  const programs = school.facts?.programs ?? [];
  const costBand = school.facts?.costBand;
  const fleetAircraft = school.facts?.fleetAircraft ?? [];
  const rating = school.facts?.rating;
  const ratingCount = school.facts?.ratingCount;

  return (
    <Link href={`/schools/${school.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer flex flex-col pt-0">
        {/* Image Section */}
        <div className="relative w-full h-48 bg-muted overflow-hidden rounded-t-lg">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={school.canonicalName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              onError={() => setImageError(true)}
              unoptimized={
                imageUrl.includes("google.com/s2/favicons") ||
                imageUrl.startsWith("/api/photos")
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
              <Plane className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          {/* Save button overlay */}
          <div className="absolute top-2 right-2">
            <SaveButton schoolId={school.id} variant="ghost" size="icon" />
          </div>
        </div>

        <CardHeader className="flex-1 pb-2">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">
            {school.canonicalName}
          </h3>

          {/* Programs */}
          {programs.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {programs.slice(0, 3).map((program) => (
                <Badge key={program} variant="secondary" className="text-xs">
                  {program}
                </Badge>
              ))}
              {programs.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{programs.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Rating */}
          {rating !== undefined && (
            <div className="flex items-center gap-1 text-sm mb-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{rating.toFixed(1)}</span>
              {ratingCount !== undefined && (
                <span className="text-muted-foreground">({ratingCount})</span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {/* Cost Band */}
          {costBand && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Badge
                variant={
                  costBand === "LOW"
                    ? "default"
                    : costBand === "MID"
                    ? "secondary"
                    : "outline"
                }
                className="text-xs"
              >
                {costBand}
              </Badge>
            </div>
          )}

          {/* Fleet Summary */}
          {fleetAircraft.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Plane className="h-4 w-4" />
              <span className="line-clamp-1">
                {fleetAircraft.slice(0, 2).join(", ")}
                {fleetAircraft.length > 2 && ` +${fleetAircraft.length - 2}`}
              </span>
            </div>
          )}

          {/* Location */}
          {addressParts && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{addressParts}</span>
            </div>
          )}

          {/* Domain */}
          {school.domain && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1 truncate">{school.domain}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
