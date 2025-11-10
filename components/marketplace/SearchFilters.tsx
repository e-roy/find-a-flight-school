"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Plane, CreditCard } from "lucide-react";
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
        <div className="flex items-center space-x-2">
          <Checkbox
            id="financingAvailable"
            checked={filters.financingAvailable || false}
            onCheckedChange={(checked) =>
              onFiltersChange({
                ...filters,
                financingAvailable: checked ? true : undefined,
              })
            }
          />
          <Label
            htmlFor="financingAvailable"
            className="flex items-center gap-2 cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Financing Available
          </Label>
        </div>
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
