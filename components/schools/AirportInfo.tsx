"use client";

import { FactItem } from "./FactSection";
import { Plane, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

interface AirportInfoProps {
  airportCode: string;
}

export function AirportInfo({ airportCode }: AirportInfoProps) {
  const {
    data: airportData,
    isLoading,
    error,
  } = trpc.schools.getAirportData.useQuery(
    { airportCode },
    {
      enabled: !!airportCode,
      staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    }
  );

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Plane className="h-4 w-4 text-muted-foreground" />
          Airport Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <FactItem
          label="Airport Code"
          value={
            <span className="font-mono text-sm font-semibold">
              {airportCode}
            </span>
          }
        />

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading airport data...</span>
          </div>
        )}

        {error && (
          <div className="text-xs text-muted-foreground py-2">
            <p>Unable to load airport data</p>
          </div>
        )}

        {!isLoading && !error && !airportData && (
          <div className="text-xs text-muted-foreground py-2">
            <p>Airport data not available</p>
            <p className="mt-1">
              Detailed airport information (runways, frequencies, fuel) is not
              available for this airport. This may be because it&apos;s a
              smaller airport or the data source doesn&apos;t have complete
              records.
            </p>
          </div>
        )}

        {airportData && (
          <>
            {airportData.airportName && (
              <FactItem
                label="Airport Name"
                value={
                  <span className="text-sm">{airportData.airportName}</span>
                }
              />
            )}

            {airportData.runways && airportData.runways.length > 0 && (
              <FactItem
                label="Runways"
                value={
                  <div className="space-y-1">
                    {airportData.runways.map((runway, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-mono font-semibold">
                          {runway.identifier}
                        </span>
                        : {runway.length.toLocaleString()} ft × {runway.width}{" "}
                        ft ({runway.surface})
                      </div>
                    ))}
                  </div>
                }
              />
            )}

            {airportData.frequencies && airportData.frequencies.length > 0 && (
              <FactItem
                label="Frequencies"
                value={
                  <div className="space-y-1">
                    {airportData.frequencies.map((freq, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-semibold">{freq.type}</span>:{" "}
                        <span className="font-mono">{freq.frequency}</span>
                      </div>
                    ))}
                  </div>
                }
              />
            )}

            {airportData.fuelAvailable &&
              airportData.fuelAvailable.length > 0 && (
                <FactItem
                  label="Fuel Available"
                  value={
                    <div className="flex flex-wrap gap-2">
                      {airportData.fuelAvailable.map((fuel, idx) => (
                        <span
                          key={idx}
                          className="text-sm px-2 py-1 bg-muted rounded"
                        >
                          {fuel}
                        </span>
                      ))}
                    </div>
                  }
                />
              )}

            {airportData.services && airportData.services.length > 0 && (
              <FactItem
                label="Services"
                value={
                  <div className="flex flex-wrap gap-2">
                    {airportData.services.map((service, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-muted rounded"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                }
              />
            )}

            {airportData.elevation !== undefined && (
              <FactItem
                label="Elevation"
                value={
                  <span className="text-sm">
                    {airportData.elevation.toLocaleString()} ft MSL
                  </span>
                }
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
