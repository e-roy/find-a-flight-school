"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PROGRAM_TYPES, COST_BANDS } from "@/types";
import Link from "next/link";

interface MatchResult {
  school_id: string;
  score: number;
  reasons: string[];
  school_name?: string;
}

export default function MatchTesterPage() {
  const [location, setLocation] = useState({ lat: "", lng: "" });
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState("100");
  const [programs, setPrograms] = useState<string[]>([]);
  const [budgetBand, setBudgetBand] = useState<string>("");
  const [aircraft, setAircraft] = useState<string[]>([]);
  const [aircraftInput, setAircraftInput] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      const requestBody: {
        location?: { lat: number; lng: number };
        city?: string;
        radiusKm: number;
        programs?: string[];
        budgetBand?: string;
        aircraft?: string[];
      } = {
        radiusKm: Number(radiusKm) || 100,
      };

      if (location.lat && location.lng) {
        requestBody.location = {
          lat: Number(location.lat),
          lng: Number(location.lng),
        };
      }

      if (city) {
        requestBody.city = city;
      }

      if (programs.length > 0) {
        requestBody.programs = programs;
      }

      if (budgetBand) {
        requestBody.budgetBand = budgetBand as typeof COST_BANDS[keyof typeof COST_BANDS];
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
        throw new Error(error.error || "Failed to run match");
      }

      const data = await response.json();
      setResults(data.results || []);
      toast.success(`Found ${data.results?.length || 0} matching schools`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to run match"
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Match Tester</h2>
        <p className="text-muted-foreground">
          Test the match API with different search criteria
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Criteria</CardTitle>
          <CardDescription>
            Fill in the fields below to test the match API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={location.lat}
                  onChange={(e) =>
                    setLocation({ ...location, lat: e.target.value })
                  }
                  placeholder="e.g., 40.7128"
                />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={location.lng}
                  onChange={(e) =>
                    setLocation({ ...location, lng: e.target.value })
                  }
                  placeholder="e.g., -74.0060"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="city">City (alternative to lat/lng)</Label>
              <Input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., New York"
              />
            </div>

            <div>
              <Label htmlFor="radiusKm">Radius (km)</Label>
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

            <div>
              <Label>Programs</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.values(PROGRAM_TYPES).map((program) => (
                  <div key={program} className="flex items-center space-x-2">
                    <Checkbox
                      id={program}
                      checked={programs.includes(program)}
                      onCheckedChange={() => handleProgramToggle(program)}
                    />
                    <label
                      htmlFor={program}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {program}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="budgetBand">Budget Band</Label>
              <Select value={budgetBand} onValueChange={setBudgetBand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget band" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {Object.values(COST_BANDS).map((band) => (
                    <SelectItem key={band} value={band}>
                      {band}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aircraft">Aircraft</Label>
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
                  placeholder="Enter aircraft type and press Enter"
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
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => handleAircraftRemove(a)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Running Match..." : "Run Match"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {results.length} matching schools found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School ID</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Reasons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.school_id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/schools/${result.school_id}`}
                          className="text-primary hover:underline"
                        >
                          {result.school_name || result.school_id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {(result.score * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside space-y-1">
                          {result.reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

