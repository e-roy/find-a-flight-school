/**
 * FAA Airport Data fetching utility
 * Fetches airport data from FAA Data.gov sources
 */

import type { FAAAirportData } from "@/types";

// In-memory cache to avoid repeated API calls
const airportDataCache = new Map<string, FAAAirportData | null>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

/**
 * Normalize airport code to handle variations (e.g., "KADS" vs "ADS")
 */
function normalizeAirportCode(code: string): string {
  const upperCode = code.toUpperCase().trim();
  
  // Filter out invalid codes like "USA" which is a country code, not an airport code
  // Valid airport codes are typically 3-4 characters (IATA: 3, ICAO: 4)
  if (upperCode.length < 3 || upperCode.length > 4) {
    return upperCode; // Return as-is, let the fetch handle it
  }
  
  // If code doesn't start with K and is 3 chars, assume it's IATA
  // For now, just return uppercase
  return upperCode;
}

/**
 * Fetch airport data from FAA Data.gov
 * 
 * Note: FAA Data.gov doesn't have a direct REST API for airport data.
 * This function provides a structure for integrating with:
 * 1. FAA Airport Facility Directory (AFD) data files
 * 2. Third-party APIs that aggregate FAA data
 * 3. Local database if airport data is pre-populated
 * 
 * For MVP, this returns a structure that can be extended with actual data sources.
 */
export async function fetchFAAAirportData(
  airportCode: string
): Promise<FAAAirportData | null> {
  const normalizedCode = normalizeAirportCode(airportCode);

  // Check cache first
  const cached = airportDataCache.get(normalizedCode);
  const cacheTime = cacheTimestamps.get(normalizedCode);
  if (cached !== undefined && cacheTime) {
    const age = Date.now() - cacheTime;
    if (age < CACHE_TTL) {
      return cached;
    }
  }

  try {
    // Try multiple free data sources
    // Source 1: Airport Codes dataset (GitHub)
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/datasets/airport-codes/master/data/airport-codes.json`,
        {
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const airports = Array.isArray(data) ? data : data.airports || [];
        
        // Find airport by code (could be IATA or ICAO)
        const airport = airports.find(
          (apt: any) =>
            apt?.iata_code === normalizedCode ||
            apt?.ident === normalizedCode ||
            apt?.gps_code === normalizedCode ||
            apt?.local_code === normalizedCode ||
            apt?.iata === normalizedCode ||
            apt?.icao === normalizedCode
        );

        if (airport) {
          // Parse coordinates
          let coordinates: { lat: number; lng: number } | undefined;
          if (airport.coordinates) {
            if (typeof airport.coordinates === "object") {
              coordinates = {
                lat: parseFloat(String(airport.coordinates.latitude || airport.coordinates.lat || 0)),
                lng: parseFloat(String(airport.coordinates.longitude || airport.coordinates.lng || 0)),
              };
            }
          } else if (airport.latitude && airport.longitude) {
            coordinates = {
              lat: parseFloat(String(airport.latitude)),
              lng: parseFloat(String(airport.longitude)),
            };
          }

          const faaData: FAAAirportData = {
            airportCode: normalizedCode,
            airportName: airport.name || airport.airport_name || undefined,
            coordinates,
            elevation: airport.elevation_ft
              ? parseInt(String(airport.elevation_ft))
              : airport.elevation
              ? parseInt(String(airport.elevation))
              : undefined,
            // Note: This dataset doesn't have runways/frequencies/fuel
            // Those would need to come from a more comprehensive source
          };

          airportDataCache.set(normalizedCode, faaData);
          cacheTimestamps.set(normalizedCode, Date.now());
          return faaData;
        }
      }
    } catch (fetchError) {
      // Silently continue to next data source
    }

    // Source 2: Try AviationAPI (free tier, no key required for basic data)
    // This has more comprehensive data including runways and frequencies
    try {
      const aviationApiUrl = `https://api.aviationapi.com/v1/airports?apt=${normalizedCode}`;
      const response = await fetch(aviationApiUrl, {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        // AviationAPI returns data keyed by airport code
        const airportData = data[normalizedCode];
        
        if (airportData && Array.isArray(airportData) && airportData.length > 0) {
          const airport = airportData[0];

          const faaData: FAAAirportData = {
            airportCode: normalizedCode,
            airportName: airport.facility_name || undefined,
            coordinates: airport.latitude && airport.longitude
              ? {
                  lat: parseFloat(String(airport.latitude)),
                  lng: parseFloat(String(airport.longitude)),
                }
              : undefined,
            elevation: airport.elevation ? parseInt(String(airport.elevation)) : undefined,
            runways: airport.runways?.map((rw: any) => ({
              identifier: rw.runway_id || rw.ident || "",
              length: rw.length || 0,
              width: rw.width || 0,
              surface: rw.surface || "Unknown",
            })),
            frequencies: airport.frequencies?.map((freq: any) => ({
              type: freq.type || freq.frequency_type || "Unknown",
              frequency: freq.frequency || freq.freq || "",
            })),
            fuelAvailable: airport.fuel_types ? [airport.fuel_types].flat() : undefined,
            services: airport.services ? [airport.services].flat() : undefined,
          };

          airportDataCache.set(normalizedCode, faaData);
          cacheTimestamps.set(normalizedCode, Date.now());
          return faaData;
        }
      }
    } catch (fetchError) {
      // Silently continue
    }

    // If no data found, return null
    // Cache the null result to avoid repeated failed lookups
    airportDataCache.set(normalizedCode, null);
    cacheTimestamps.set(normalizedCode, Date.now());
    
    return null;
  } catch (error) {
    console.error(`Error fetching FAA data for airport ${normalizedCode}:`, error);
    
    // Cache null result on error
    airportDataCache.set(normalizedCode, null);
    cacheTimestamps.set(normalizedCode, Date.now());
    
    return null;
  }
}

/**
 * Parse FAA airport data from API response
 * This will be implemented based on the actual data format
 */
function parseFAAAirportData(rawData: unknown): FAAAirportData | null {
  // TODO: Implement parsing based on actual FAA data format
  // This is a placeholder that will be updated once we know the data structure
  
  if (!rawData || typeof rawData !== "object") {
    return null;
  }

  // Example parsing structure (to be updated with actual format):
  // const data = rawData as Record<string, unknown>;
  // return {
  //   airportCode: data.airportCode as string,
  //   airportName: data.airportName as string,
  //   runways: parseRunways(data.runways),
  //   frequencies: parseFrequencies(data.frequencies),
  //   fuelAvailable: parseFuel(data.fuel),
  //   services: parseServices(data.services),
  // };

  return null;
}

/**
 * Clear the airport data cache
 * Useful for testing or forcing refresh
 */
export function clearFAAAirportCache(): void {
  airportDataCache.clear();
  cacheTimestamps.clear();
}

/**
 * Get cached airport data without fetching
 */
export function getCachedFAAAirportData(
  airportCode: string
): FAAAirportData | null | undefined {
  const normalizedCode = normalizeAirportCode(airportCode);
  return airportDataCache.get(normalizedCode);
}

