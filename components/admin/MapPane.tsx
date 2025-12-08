"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps-loader";
import type { Candidate } from "@/lib/discovery/google";

interface MapPaneProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  candidates: Candidate[];
  selectedCandidateId?: string;
  onCandidateSelect: (candidate: Candidate) => void;
}

export function MapPane({
  center,
  radiusKm,
  candidates,
  selectedCandidateId,
  onCandidateSelect,
}: MapPaneProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const centerMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setError(
          "Map loading timed out. Please check your API key and network connection."
        );
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
                center,
                zoom: 10,
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true,
              });

              mapInstanceRef.current = map;
              setIsLoading(false);
              setError(null);
              setMapReady(true);
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
      setMapReady(false);
    };
  }, [center]);

  // Update center marker
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Remove existing center marker
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setMap(null);
    }

    // Create center marker
    centerMarkerRef.current = new window.google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
      title: "Search Center",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      },
      zIndex: 1000,
    });

    // Update map center
    mapInstanceRef.current.setCenter(center);
  }, [center]);

  // Update radius circle
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Remove existing circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Create radius circle
    circleRef.current = new window.google.maps.Circle({
      strokeColor: "#4285F4",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#4285F4",
      fillOpacity: 0.15,
      map: mapInstanceRef.current,
      center: center,
      radius: radiusKm * 1000, // Convert km to meters
    });
  }, [center, radiusKm]);

  // Update candidate markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps || !mapReady) return;

    // Clear existing markers and info windows
    markersRef.current.forEach((marker) => marker.setMap(null));
    infoWindowsRef.current.forEach((infoWindow) => infoWindow.close());
    markersRef.current = [];
    infoWindowsRef.current = [];

    if (candidates.length === 0) return;

    // Create markers for each candidate
    candidates.forEach((candidate) => {
      const isSelected =
        selectedCandidateId === candidate.placeId ||
        selectedCandidateId === `${candidate.lat},${candidate.lng}`;

      const marker = new window.google.maps.Marker({
        position: { lat: candidate.lat, lng: candidate.lng },
        map: mapInstanceRef.current!,
        title: candidate.name,
        icon: isSelected
          ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#EA4335",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            }
          : {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#34A853",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            },
        zIndex: isSelected ? 1000 : 100,
      });

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${
              candidate.name
            }</h3>
            ${
              candidate.address
                ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${candidate.address}</p>`
                : ""
            }
            ${
              candidate.phone
                ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${candidate.phone}</p>`
                : ""
            }
            ${
              candidate.website
                ? `<p style="margin: 0; font-size: 12px;"><a href="${candidate.website}" target="_blank" rel="noopener noreferrer" style="color: #4285F4;">Visit Website</a></p>`
                : ""
            }
          </div>
        `,
      });

      // Add click handler
      marker.addListener("click", () => {
        onCandidateSelect(candidate);
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });

    // Fit bounds to show all candidates
    if (candidates.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      candidates.forEach((candidate) => {
        bounds.extend({ lat: candidate.lat, lng: candidate.lng });
      });
      // Also include center in bounds
      bounds.extend(center);
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [candidates, selectedCandidateId, onCandidateSelect, center, mapReady]);

  // Pan to selected candidate
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedCandidateId) return;

    const selectedCandidate = candidates.find(
      (c) =>
        c.placeId === selectedCandidateId ||
        `${c.lat},${c.lng}` === selectedCandidateId
    );

    if (selectedCandidate) {
      mapInstanceRef.current.panTo({
        lat: selectedCandidate.lat,
        lng: selectedCandidate.lng,
      });

      // Open info window for selected marker
      const markerIndex = candidates.findIndex(
        (c) =>
          (c.placeId === selectedCandidateId ||
            `${c.lat},${c.lng}` === selectedCandidateId) &&
          c.lat === selectedCandidate.lat &&
          c.lng === selectedCandidate.lng
      );

      if (markerIndex >= 0 && infoWindowsRef.current[markerIndex]) {
        infoWindowsRef.current[markerIndex].open(
          mapInstanceRef.current,
          markersRef.current[markerIndex]
        );
      }
    }
  }, [selectedCandidateId, candidates]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      {/* Map container - always rendered so ref is available */}
      <div
        ref={mapRef}
        className="w-full h-full min-h-[400px] rounded-lg border"
        style={{ height: "100%", minHeight: "400px" }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg z-10">
          <div className="text-center">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg z-10">
          <div className="text-center p-6 max-w-md">
            <p className="text-destructive font-medium">Error loading map</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            {error.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY") && (
              <p className="text-xs text-muted-foreground mt-4">
                Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file and
                restart the dev server.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
