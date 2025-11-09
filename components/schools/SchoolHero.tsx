"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaveButton } from "@/components/marketplace/SaveButton";
import { TierBadge } from "@/components/schools/TierBadge";
import { Star, Globe, Plane, Mail, DollarSign } from "lucide-react";
import { getPhotoUrl } from "@/lib/utils-photos";
import type { schools } from "@/db/schema/schools";

type School = typeof schools.$inferSelect;

interface SchoolHeroProps {
  school: School;
  facts?: {
    programs?: string[];
    costBand?: string;
    rating?: number;
    ratingCount?: number;
    photos?: (string | { name: string })[];
  };
  recentlyUpdated?: boolean;
  signals?: {
    trainingVelocity: number | null;
    scheduleReliability: number | null;
    safetyNotes?: string | null;
  };
  onContactClick?: () => void;
  onFinancingClick?: () => void;
}

function getImageUrl(
  school: School,
  photos?: (string | { name: string })[]
): string | null {
  // 1. Try photos fact (first photo if array exists)
  if (photos && Array.isArray(photos) && photos.length > 0) {
    const firstPhoto = photos[0];
    const photoUrl = getPhotoUrl(firstPhoto);
    if (photoUrl) {
      return photoUrl;
    }
  }

  // 2. Try domain-based favicon
  if (school.domain) {
    let domain: string;
    try {
      domain = school.domain.startsWith("http")
        ? new URL(school.domain).hostname
        : school.domain.replace(/^www\./, "");
    } catch {
      domain = school.domain.replace(/^www\./, "");
    }
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  }

  // 3. Return null for placeholder
  return null;
}

export function SchoolHero({
  school,
  facts,
  recentlyUpdated,
  signals,
  onContactClick,
  onFinancingClick,
}: SchoolHeroProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(school, facts?.photos);

  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50">
      {/* Background Image */}
      {imageUrl && !imageError ? (
        <Image
          src={imageUrl}
          alt={school.canonicalName}
          fill
          className="object-cover"
          sizes="100vw"
          onError={() => setImageError(true)}
          unoptimized={
            imageUrl.includes("google.com/s2/favicons") ||
            imageUrl.startsWith("/api/photos")
          }
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Plane className="h-24 w-24 text-muted-foreground/30" />
        </div>
      )}

      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-6 md:p-8 lg:p-10">
        <div className="space-y-4">
          {/* School Name and Badges */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                {school.canonicalName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
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
                {facts?.rating !== undefined && (
                  <div className="flex items-center gap-1 text-white">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-sm">
                      {facts.rating.toFixed(1)}
                    </span>
                    {facts.ratingCount !== undefined && (
                      <span className="text-xs text-white/80">
                        ({facts.ratingCount})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info and Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            {school.domain && (
              <a
                href={`https://${school.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/90 hover:text-white text-sm underline"
              >
                <Globe className="h-4 w-4" />
                {school.domain}
              </a>
            )}
            {facts?.costBand && (
              <div className="flex items-center gap-2 text-white/90">
                <DollarSign className="h-4 w-4" />
                <Badge
                  variant={
                    facts.costBand === "LOW"
                      ? "default"
                      : facts.costBand === "MID"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {facts.costBand}
                </Badge>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap pt-2">
            <SaveButton schoolId={school.id} variant="default" size="default" />

            {onFinancingClick && (
              <Button
                onClick={onFinancingClick}
                variant="outline"
                size="default"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Check Financing
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
