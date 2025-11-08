"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PROGRAM_TYPES,
  COST_BANDS,
  type ProgramType,
  type CostBand,
} from "@/types";
import { MapPin, Plane, DollarSign } from "lucide-react";
import type { MatchRequest } from "@/lib/validation";

interface SearchFiltersProps {
  filters: Partial<MatchRequest>;
  onFiltersChange: (filters: Partial<MatchRequest>) => void;
}

export function SearchFilters({
  filters,
  onFiltersChange,
}: SearchFiltersProps) {
  const [aircraftInput, setAircraftInput] = useState("");

  const handleProgramToggle = (program: ProgramType) => {
    const currentPrograms = filters.programs || [];
    const newPrograms = currentPrograms.includes(program)
      ? currentPrograms.filter((p) => p !== program)
      : [...currentPrograms, program];
    onFiltersChange({
      ...filters,
      programs: newPrograms.length > 0 ? newPrograms : undefined,
    });
  };

  const handleAircraftAdd = () => {
    if (aircraftInput.trim()) {
      const currentAircraft = filters.aircraft || [];
      const newAircraft = [...currentAircraft, aircraftInput.trim()];
      setAircraftInput("");
      onFiltersChange({ ...filters, aircraft: newAircraft });
    }
  };

  const handleAircraftRemove = (aircraftToRemove: string) => {
    const currentAircraft = filters.aircraft || [];
    const newAircraft = currentAircraft.filter((a) => a !== aircraftToRemove);
    onFiltersChange({
      ...filters,
      aircraft: newAircraft.length > 0 ? newAircraft : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="city" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          City
        </Label>
        <Input
          id="city"
          type="text"
          value={filters.city || ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              city: e.target.value.trim() || undefined,
            })
          }
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
          value={filters.radiusKm || 100}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              radiusKm: e.target.value ? Number(e.target.value) : 100,
            })
          }
          placeholder="100"
        />
      </div>

      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Plane className="h-4 w-4" />
          Programs
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.values(PROGRAM_TYPES).map((program) => (
            <div key={program} className="flex items-center space-x-2">
              <Checkbox
                id={program}
                checked={(filters.programs || []).includes(program)}
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
          value={filters.budgetBand || undefined}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              budgetBand: value ? (value as CostBand) : undefined,
            })
          }
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
          <Button type="button" variant="outline" onClick={handleAircraftAdd}>
            Add
          </Button>
        </div>
        {(filters.aircraft || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {(filters.aircraft || []).map((a) => (
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
    </div>
  );
}
