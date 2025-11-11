"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps-loader";

interface GoogleMapEmbedProps {
  lat: number;
  lng: number;
  schoolName: string;
  zoom?: number;
}

export function GoogleMapEmbed({
  lat,
  lng,
  schoolName,
  zoom = 15,
}: GoogleMapEmbedProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setError("Map loading timed out. Please check your API key and network connection.");
        setIsLoading(false);
      }
    }, 15000); // 15 second timeout

    loadGoogleMaps()
      .then(() => {
        clearTimeout(timeoutId);
        if (!isMounted || !mapRef.current) return;

        // Wait for Map constructor to be available
        const checkMapAvailable = (attempts = 0): void => {
          if (!isMounted || !mapRef.current) return;

          if (window.google?.maps?.Map) {
            try {
              // Initialize map
              const map = new window.google.maps.Map(mapRef.current, {
                center: { lat, lng },
                zoom,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
              });

              mapInstanceRef.current = map;

              // Add marker for school location
              const marker = new window.google.maps.Marker({
                position: { lat, lng },
                map,
                title: schoolName,
              });

              markerRef.current = marker;

              setIsLoading(false);
              setError(null);
            } catch (err) {
              if (!isMounted) return;
              const errorMessage =
                err instanceof Error ? err.message : "Failed to initialize map";
              setError(errorMessage);
              setIsLoading(false);
            }
          } else if (attempts < 50) {
            // Retry up to 5 seconds (50 * 100ms)
            setTimeout(() => checkMapAvailable(attempts + 1), 100);
          } else {
            if (!isMounted) return;
            setError("Google Maps Map constructor not available");
            setIsLoading(false);
          }
        };

        checkMapAvailable();
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (!isMounted) return;
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load map";
        setError(errorMessage);
        setIsLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      isMounted = false;
      // Clean up marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      // Map instance will be cleaned up automatically when component unmounts
      mapInstanceRef.current = null;
    };
  }, [lat, lng, schoolName, zoom]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm p-4 text-center">
        <div>
          <p className="font-medium mb-1">Unable to load map</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
