"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPane } from "@/components/admin/MapPane";
import { ResultsPanel } from "@/components/admin/ResultsPanel";
import type { Candidate } from "@/lib/discovery/google";

export default function DiscoverPage() {
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState("30");
  const [query, setQuery] = useState("flight school");
  const [shouldSearch, setShouldSearch] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<
    string | undefined
  >(undefined);

  const { data, isLoading, error } = trpc.seeds.discover.useQuery(
    {
      city,
      radiusKm: Number(radiusKm) || 30,
      query: query || undefined,
    },
    {
      enabled:
        shouldSearch &&
        city.length > 0 &&
        Number(radiusKm) >= 1 &&
        Number(radiusKm) <= 500,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!city.trim()) {
      toast.error("City is required");
      return;
    }

    const radius = Number(radiusKm);
    if (isNaN(radius) || radius < 1 || radius > 500) {
      toast.error("Radius must be between 1 and 500 km");
      return;
    }

    setShouldSearch(true);
    setSelectedCandidateId(undefined);
  };

  const handleReset = () => {
    setCity("");
    setRadiusKm("30");
    setQuery("flight school");
    setShouldSearch(false);
    setSelectedCandidateId(undefined);
  };

  const getCandidateId = (candidate: Candidate): string => {
    return candidate.placeId || `${candidate.lat},${candidate.lng}`;
  };

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidateId(getCandidateId(candidate));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Discover Flight Schools</h2>
        <p className="text-muted-foreground">
          Search for flight school candidates using Google Places API
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
          <CardDescription>
            Enter a city, radius, and optional search query to discover flight
            schools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Austin, TX"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Radius (km) *</Label>
                <Input
                  id="radius"
                  type="number"
                  min="1"
                  max="500"
                  placeholder="30"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="query">Query (optional)</Label>
                <Input
                  id="query"
                  type="text"
                  placeholder="flight school"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive">
              {error.message || "An error occurred while searching"}
            </div>
          </CardContent>
        </Card>
      )}

      {data && shouldSearch && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Found {data.candidates.length} candidate(s) near{" "}
              {data.center.lat.toFixed(4)}, {data.center.lng.toFixed(4)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.candidates.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No candidates found. Try adjusting your search parameters.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px]">
                <div className="flex-1 min-w-0">
                  <MapPane
                    center={data.center}
                    radiusKm={Number(radiusKm) || 30}
                    candidates={data.candidates}
                    selectedCandidateId={selectedCandidateId}
                    onCandidateSelect={handleCandidateSelect}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <ResultsPanel
                    candidates={data.candidates}
                    selectedCandidateId={selectedCandidateId}
                    onCandidateSelect={handleCandidateSelect}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
