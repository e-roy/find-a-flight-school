"use client";

import { useState, useEffect } from "react";
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

interface ExistenceStatus {
  existsInSchools: boolean;
  matches: Array<{
    type: "school";
    id: string;
    name: string;
    domain?: string;
  }>;
}

export function DiscoverView() {
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState("30");
  const [query, setQuery] = useState("flight school");
  const [shouldSearch, setShouldSearch] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<
    string | undefined
  >(undefined);
  const [existenceStatus, setExistenceStatus] = useState<
    Map<string, ExistenceStatus>
  >(new Map());
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedSchoolIds, setImportedSchoolIds] = useState<
    Map<string, string>
  >(new Map()); // candidateId -> schoolId
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(
    new Set()
  );

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

  const utils = trpc.useUtils();

  const importMutation = trpc.seeds.import.useMutation({
    onSuccess: (result, variables) => {
      const candidateId = getCandidateId(variables);
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
      // Remove from selected set
      setSelectedCandidateIds((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
      // Track imported school ID
      if (result.schoolId) {
        setImportedSchoolIds((prev) => {
          const next = new Map(prev);
          next.set(candidateId, result.schoolId);
          return next;
        });
      }
      toast.success(
        result.isNew
          ? `Successfully created school: ${variables.name}`
          : `Successfully linked to existing school: ${variables.name}`
      );
      // Refresh existence status for this candidate
      checkExistence(variables);
      // Invalidate school queries since we're creating schools directly
      utils.schools.list.invalidate();
    },
    onError: (error, variables) => {
      const candidateId = getCandidateId(variables);
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
      toast.error(`Failed to import: ${error.message}`);
    },
  });

  const getCandidateId = (
    candidate: Candidate | { lat: number; lng: number; placeId?: string }
  ): string => {
    return candidate.placeId || `${candidate.lat},${candidate.lng}`;
  };

  const checkExistence = async (
    candidate:
      | Candidate
      | {
          name: string;
          website?: string;
          phone?: string;
          lat: number;
          lng: number;
          placeId?: string;
        }
  ) => {
    const candidateId = getCandidateId(candidate);
    try {
      const result = await utils.seeds.exists.fetch({
        domain: candidate.website,
        name: candidate.name,
        phone: candidate.phone,
      });
      setExistenceStatus((prev) => {
        const next = new Map(prev);
        next.set(candidateId, result);
        return next;
      });
    } catch (error) {
      console.error("Failed to check existence:", error);
    }
  };

  // Check existence for all candidates when data changes
  useEffect(() => {
    if (data?.candidates) {
      data.candidates.forEach((candidate) => {
        const candidateId = getCandidateId(candidate);
        // Only check if we haven't already checked
        if (!existenceStatus.has(candidateId)) {
          checkExistence(candidate);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.candidates]);

  const handleImport = (candidate: Candidate) => {
    const candidateId = getCandidateId(candidate);
    setImportingIds((prev) => new Set(prev).add(candidateId));
    importMutation.mutate({
      name: candidate.name,
      address: candidate.address,
      phone: candidate.phone,
      website: candidate.website,
      lat: candidate.lat,
      lng: candidate.lng,
      placeId: candidate.placeId,
      rating: candidate.rating,
      userRatingCount: candidate.userRatingCount,
      businessStatus: candidate.businessStatus,
      priceLevel: candidate.priceLevel,
      regularOpeningHours: candidate.regularOpeningHours,
      currentOpeningHours: candidate.currentOpeningHours,
      photos: candidate.photos,
      addressComponents: candidate.addressComponents,
      types: candidate.types,
      primaryType: candidate.primaryType,
      queryParams: {
        city,
        radiusKm: Number(radiusKm) || 30,
        query: query || undefined,
      },
    });
  };

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
    setExistenceStatus(new Map());
    setImportingIds(new Set());
    setImportedSchoolIds(new Map());
    setSelectedCandidateIds(new Set());
  };

  const handleSelectionChange = (candidateId: string, selected: boolean) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(candidateId);
      } else {
        next.delete(candidateId);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (!data?.candidates) return;

    const importableIds = data.candidates
      .map((candidate) => getCandidateId(candidate))
      .filter((candidateId) => {
        const status = existenceStatus.get(candidateId);
        // Check schools since Google imports create schools directly
        return status && !status.existsInSchools;
      });

    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        importableIds.forEach((id) => next.add(id));
      } else {
        importableIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const getImportableCandidates = (): Candidate[] => {
    if (!data?.candidates) return [];
    return data.candidates.filter((candidate) => {
      const candidateId = getCandidateId(candidate);
      const status = existenceStatus.get(candidateId);
      // Check schools since Google imports create schools directly
      return status && !status.existsInSchools;
    });
  };

  const handleBulkImport = async () => {
    if (!data?.candidates) return;

    const candidatesToImport = data.candidates.filter((candidate) => {
      const candidateId = getCandidateId(candidate);
      return selectedCandidateIds.has(candidateId);
    });

    if (candidatesToImport.length === 0) {
      toast.error("No candidates selected");
      return;
    }

    // Import candidates sequentially
    for (const candidate of candidatesToImport) {
      const candidateId = getCandidateId(candidate);
      if (importingIds.has(candidateId) || importedSchoolIds.has(candidateId)) {
        continue; // Skip if already importing or imported
      }
      handleImport(candidate);
      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const handleImportAll = async () => {
    const importableCandidates = getImportableCandidates();

    if (importableCandidates.length === 0) {
      toast.error("No importable candidates found");
      return;
    }

    // Import all importable candidates sequentially
    for (const candidate of importableCandidates) {
      const candidateId = getCandidateId(candidate);
      if (importingIds.has(candidateId) || importedSchoolIds.has(candidateId)) {
        continue; // Skip if already importing or imported
      }
      handleImport(candidate);
      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidateId(getCandidateId(candidate));
  };

  return (
    <div className="space-y-6">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  Found {data.candidates.length} candidate(s) near{" "}
                  {data.center.lat.toFixed(4)}, {data.center.lng.toFixed(4)}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBulkImport}
                  disabled={
                    selectedCandidateIds.size === 0 ||
                    importingIds.size > 0 ||
                    !data.candidates.some((candidate) => {
                      const candidateId = getCandidateId(candidate);
                      return (
                        selectedCandidateIds.has(candidateId) &&
                        !importingIds.has(candidateId) &&
                        !importedSchoolIds.has(candidateId)
                      );
                    })
                  }
                >
                  Import Selected ({selectedCandidateIds.size})
                </Button>
                <Button
                  variant="default"
                  onClick={handleImportAll}
                  disabled={
                    getImportableCandidates().length === 0 ||
                    importingIds.size > 0 ||
                    getImportableCandidates().every((candidate) => {
                      const candidateId = getCandidateId(candidate);
                      return (
                        importingIds.has(candidateId) ||
                        importedSchoolIds.has(candidateId)
                      );
                    })
                  }
                >
                  Import All ({getImportableCandidates().length})
                </Button>
              </div>
            </div>
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
                    existenceStatus={existenceStatus}
                    onImport={handleImport}
                    importingIds={importingIds}
                    importedSchoolIds={importedSchoolIds}
                    selectedCandidateIds={selectedCandidateIds}
                    onSelectionChange={handleSelectionChange}
                    onSelectAll={handleSelectAll}
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
