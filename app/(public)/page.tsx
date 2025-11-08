"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PROGRAM_TYPES, COST_BANDS } from "@/types";
import Link from "next/link";
import { Search, MapPin, Plane, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

interface MatchResult {
  school_id: string;
  score: number;
  reasons: string[];
}

interface SchoolInfo {
  id: string;
  canonicalName: string;
  domain: string | null;
}

export default function Home() {
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState("100");
  const [programs, setPrograms] = useState<string[]>([]);
  const [budgetBand, setBudgetBand] = useState<string>("");
  const [aircraft, setAircraft] = useState<string[]>([]);
  const [aircraftInput, setAircraftInput] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolNames, setSchoolNames] = useState<Map<string, SchoolInfo>>(
    new Map()
  );
  const [isLoadingNames, setIsLoadingNames] = useState(false);

  const utils = trpc.useUtils();

  // Fetch school names when results change
  useEffect(() => {
    if (results.length === 0) {
      setSchoolNames(new Map());
      return;
    }

    const fetchSchoolNames = async () => {
      setIsLoadingNames(true);
      const namesMap = new Map<string, SchoolInfo>();

      try {
        // Fetch school names in parallel
        const promises = results.map(async (result) => {
          try {
            const school = await utils.schools.byId.fetch({
              id: result.school_id,
            });
            if (school) {
              namesMap.set(result.school_id, {
                id: school.id,
                canonicalName: school.canonicalName,
                domain: school.domain,
              });
            }
          } catch (error) {
            console.error(`Failed to fetch school ${result.school_id}:`, error);
          }
        });

        await Promise.all(promises);
        setSchoolNames(namesMap);
      } catch (error) {
        console.error("Error fetching school names:", error);
      } finally {
        setIsLoadingNames(false);
      }
    };

    fetchSchoolNames();
  }, [results, utils]);

  const handleProgramToggle = (program: string) => {
    setPrograms((prev) =>
      prev.includes(program)
        ? prev.filter((p) => p !== program)
        : [...prev, program]
    );
  };

  const handleAircraftAdd = () => {
    if (aircraftInput.trim()) {
      setAircraft((prev) => [...prev, aircraftInput.trim()]);
      setAircraftInput("");
    }
  };

  const handleAircraftRemove = (aircraftToRemove: string) => {
    setAircraft((prev) => prev.filter((a) => a !== aircraftToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResults([]);

    try {
      const requestBody: {
        city?: string;
        radiusKm: number;
        programs?: string[];
        budgetBand?: string;
        aircraft?: string[];
      } = {
        radiusKm: Number(radiusKm) || 100,
      };

      if (city) {
        requestBody.city = city;
      }

      if (programs.length > 0) {
        requestBody.programs = programs;
      }

      if (budgetBand) {
        requestBody.budgetBand =
          budgetBand as (typeof COST_BANDS)[keyof typeof COST_BANDS];
      }

      if (aircraft.length > 0) {
        requestBody.aircraft = aircraft;
      }

      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to search schools");
      }

      const data = await response.json();
      const matchResults = data.results || [];
      setResults(matchResults);

      if (matchResults.length === 0) {
        toast.info("No schools found matching your criteria");
      } else {
        toast.success(
          `Found ${matchResults.length} matching school${
            matchResults.length !== 1 ? "s" : ""
          }`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to search schools"
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find Your Flight School
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Search and compare flight schools based on programs, location,
            budget, and more. Get AI-powered recommendations tailored to your
            goals.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Criteria
            </CardTitle>
            <CardDescription>
              Fill in your preferences to find matching flight schools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    City
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., New York, Los Angeles"
                  />
                </div>

                <div>
                  <Label htmlFor="radiusKm">Search Radius (km)</Label>
                  <Input
                    id="radiusKm"
                    type="number"
                    min="1"
                    max="5000"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Plane className="h-4 w-4" />
                  Programs
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.values(PROGRAM_TYPES).map((program) => (
                    <div key={program} className="flex items-center space-x-2">
                      <Checkbox
                        id={program}
                        checked={programs.includes(program)}
                        onCheckedChange={() => handleProgramToggle(program)}
                      />
                      <label
                        htmlFor={program}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {program}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="budgetBand" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget Band
                </Label>
                <Select
                  value={budgetBand || undefined}
                  onValueChange={(value) => setBudgetBand(value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget band (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(COST_BANDS).map((band) => (
                      <SelectItem key={band} value={band}>
                        {band}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="aircraft">Preferred Aircraft Types</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="aircraft"
                    type="text"
                    value={aircraftInput}
                    onChange={(e) => setAircraftInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAircraftAdd();
                      }
                    }}
                    placeholder="e.g., Cessna 172, Piper Cherokee"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAircraftAdd}
                  >
                    Add
                  </Button>
                </div>
                {aircraft.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {aircraft.map((a) => (
                      <Badge
                        key={a}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {a}
                        <button
                          type="button"
                          onClick={() => handleAircraftRemove(a)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Schools
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading && results.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {results.length} School{results.length !== 1 ? "s" : ""} Found
              </h2>
              {isLoadingNames && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading details...
                </div>
              )}
            </div>

            <div className="grid gap-4">
              {results.map((result, index) => {
                const schoolInfo = schoolNames.get(result.school_id);
                const schoolName =
                  schoolInfo?.canonicalName || result.school_id;
                const isTopMatch = index < 3 && result.reasons.length > 0;

                return (
                  <Card
                    key={result.school_id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">
                            <Link
                              href={`/schools/${result.school_id}`}
                              className="hover:underline text-primary"
                            >
                              {schoolName}
                            </Link>
                          </CardTitle>
                          {schoolInfo?.domain && (
                            <CardDescription className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <a
                                href={`https://${schoolInfo.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {schoolInfo.domain}
                              </a>
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className="text-sm">
                            {(result.score * 100).toFixed(0)}% match
                          </Badge>
                          {isTopMatch && (
                            <Badge variant="default" className="text-xs">
                              Top Match
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {isTopMatch && result.reasons.length > 0 && (
                      <CardContent>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground">
                            Why this school matches:
                          </h4>
                          <ul className="space-y-1">
                            {result.reasons.map((reason, idx) => (
                              <li
                                key={idx}
                                className="text-sm flex items-start gap-2"
                              >
                                <span className="text-primary mt-1">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && results.length === 0 && city && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No schools found. Try adjusting your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

