"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhotosGalleryProps {
  photos: string[];
  schoolName: string;
}

export function PhotosGallery({ photos, schoolName }: PhotosGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Filter out empty strings and invalid URLs
  const validPhotos = photos.filter(
    (photo) => photo && typeof photo === "string" && photo.trim().length > 0
  );

  if (!validPhotos || validPhotos.length === 0) {
    return null;
  }

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {validPhotos.slice(0, 8).map((photo, index) => {
              const hasError = imageErrors.has(index);
              // Ensure photo is a valid URL string
              if (
                !photo ||
                typeof photo !== "string" ||
                photo.trim().length === 0
              ) {
                return null;
              }
              return (
                <button
                  key={`${photo}-${index}`}
                  onClick={() => !hasError && setSelectedPhoto(photo)}
                  className="relative w-full aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-muted"
                  disabled={hasError}
                  type="button"
                >
                  {!hasError ? (
                    <Image
                      src={photo}
                      alt={`${schoolName} - Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      unoptimized={true}
                      onError={() => handleImageError(index)}
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {validPhotos.length > 8 && (
            <p className="text-sm text-muted-foreground mt-4">
              +{validPhotos.length - 8} more photos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{schoolName}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="relative aspect-video w-full min-h-[300px] bg-muted">
              <Image
                src={selectedPhoto}
                alt={`${schoolName} - Full size`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={true}
                onError={() => setSelectedPhoto(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
