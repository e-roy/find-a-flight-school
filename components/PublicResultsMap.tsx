"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_MAP_ID, loadGoogleMaps } from "@/lib/maps-loader";
import { circleMarkerElement } from "@/lib/maps-marker";

export interface MapCandidate {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface PublicResultsMapProps {
  candidates: MapCandidate[];
  selectedId: string | null;
  onSelect: (placeId: string) => void;
}

function circleContent(selected: boolean): HTMLDivElement {
  return circleMarkerElement(
    selected ? "#ea4335" : "#2563eb",
    selected ? 22 : 16
  );
}

/**
 * Lightweight Google map for the public add-a-school flow: plots result markers,
 * fits bounds, syncs selection with the results list, and reports marker clicks.
 */
export function PublicResultsMap({
  candidates,
  selectedId,
  onSelect,
}: PublicResultsMapProps) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(
    new Map()
  );
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Initialize the map once.
  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (!mounted || !mapDiv.current || mapRef.current || !window.google)
          return;
        mapRef.current = new window.google.maps.Map(mapDiv.current, {
          center: { lat: 39.5, lng: -98.35 }, // continental US
          zoom: 4,
          mapId: GOOGLE_MAPS_MAP_ID,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        setReady(true);
      })
      .catch(() => {
        /* loader surfaces missing-key errors; map just stays blank */
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Re-render markers when results change OR once the map becomes ready (the map
  // mounts at the same time results arrive, so this effect must re-run on ready).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !window.google?.maps) return;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current.clear();
    if (candidates.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    for (const c of candidates) {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: c.lat, lng: c.lng },
        map,
        title: c.name,
        content: circleContent(false),
        gmpClickable: true,
      });
      marker.addListener("click", () => onSelectRef.current(c.placeId));
      markersRef.current.set(c.placeId, marker);
      bounds.extend({ lat: c.lat, lng: c.lng });
    }
    map.fitBounds(bounds);
    if (candidates.length === 1) map.setZoom(13);
  }, [candidates, ready]);

  // Highlight + pan to the selected marker.
  useEffect(() => {
    if (!ready || !window.google?.maps) return;
    markersRef.current.forEach((marker, id) => {
      const selected = id === selectedId;
      marker.content = circleContent(selected);
      marker.zIndex = selected ? 1000 : 1;
    });
    if (selectedId) {
      const pos = markersRef.current.get(selectedId)?.position;
      if (pos && mapRef.current) mapRef.current.panTo(pos);
    }
  }, [selectedId, ready]);

  return (
    <div ref={mapDiv} className="h-full w-full min-h-[420px] rounded-lg border" />
  );
}
