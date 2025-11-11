/**
 * Google Places API discovery provider
 * Enables searching for flight school candidates by city/radius using Google Places API (New)
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_NEARBY_API_URL =
  "https://places.googleapis.com/v1/places:searchNearby";
const PLACES_TEXT_API_URL =
  "https://places.googleapis.com/v1/places:searchText";
const PLACES_GET_API_URL = "https://places.googleapis.com/v1/places";

if (!GOOGLE_PLACES_API_KEY) {
  console.warn(
    "GOOGLE_PLACES_API_KEY environment variable is not set. Google Places discovery will fail."
  );
}

export interface Candidate {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  lat: number;
  lng: number;
  placeId?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  priceLevel?: string;
  regularOpeningHours?: any;
  currentOpeningHours?: any;
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
  addressComponents?: any[];
  types?: string[];
  primaryType?: string;
}

export interface SearchParams {
  city: string;
  radiusKm: number;
  query?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Geocode a city name to coordinates
 */
async function geocodeCity(city: string): Promise<GeocodeResult | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  try {
    const url = new URL(GEOCODING_API_URL);
    url.searchParams.set("address", city);
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Geocoding API HTTP error: ${response.status}`, errorText);
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    // Log the response status for debugging
    if (data.status !== "OK") {
      console.error(`Geocoding API status: ${data.status}`, {
        city,
        errorMessage: data.error_message,
        results: data.results?.length || 0,
      });
      return null;
    }

    if (!data.results?.[0]?.geometry?.location) {
      console.error("Geocoding API: No location in results", {
        city,
        resultsCount: data.results?.length || 0,
      });
      return null;
    }

    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    if (error instanceof Error) {
      throw error;
    }
    return null;
  }
}

/**
 * Search for places using Google Places API (New)
 */
async function searchPlaces(
  center: GeocodeResult,
  radiusMeters: number,
  query?: string
): Promise<Candidate[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  try {
    const fieldMask =
      "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.location,places.id,places.rating,places.userRatingCount,places.businessStatus,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.photos,places.addressComponents,places.types,places.primaryType";

    let response: Response;

    // If query is provided, use searchText with location bias
    if (query) {
      const requestBody = {
        textQuery: query,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: {
              latitude: center.lat,
              longitude: center.lng,
            },
            radius: radiusMeters,
          },
        },
      };

      response = await fetch(PLACES_TEXT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(requestBody),
      });
    } else {
      // Use searchNearby with includedTypes for flight schools
      const requestBody = {
        includedTypes: ["flight_school"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: center.lat,
              longitude: center.lng,
            },
            radius: radiusMeters,
          },
        },
      };

      response = await fetch(PLACES_NEARBY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(requestBody),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Places API error: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        // Check for specific blocked API error
        if (
          errorData.error?.details?.some(
            (d: any) => d.reason === "API_KEY_SERVICE_BLOCKED"
          )
        ) {
          errorMessage =
            "Places API (New) is not enabled. Please enable 'Places API (New)' in Google Cloud Console and ensure your API key has access to it.";
        }
      } catch {
        // If parsing fails, use the raw error text
        errorMessage = `Places API error: ${
          response.status
        } ${errorText.substring(0, 200)}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    // Transform Places API response to Candidate format
    return data.places.map((place: any) => {
      const candidate: Candidate = {
        name: place.displayName?.text || "Unknown",
        address: place.formattedAddress || "",
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
        placeId: place.id,
      };

      if (place.nationalPhoneNumber) {
        candidate.phone = place.nationalPhoneNumber;
      }

      if (place.websiteUri) {
        candidate.website = place.websiteUri;
      }

      if (place.rating !== undefined && place.rating !== null) {
        candidate.rating = place.rating;
      }

      if (
        place.userRatingCount !== undefined &&
        place.userRatingCount !== null
      ) {
        candidate.userRatingCount = place.userRatingCount;
      }

      if (place.businessStatus) {
        candidate.businessStatus = place.businessStatus;
      }

      if (place.priceLevel !== undefined && place.priceLevel !== null) {
        candidate.priceLevel = place.priceLevel;
      }

      if (place.regularOpeningHours) {
        candidate.regularOpeningHours = place.regularOpeningHours;
      }

      if (place.currentOpeningHours) {
        candidate.currentOpeningHours = place.currentOpeningHours;
      }

      if (place.photos && Array.isArray(place.photos)) {
        candidate.photos = place.photos.map((photo: any) => ({
          name: photo.name || "",
          widthPx: photo.widthPx,
          heightPx: photo.heightPx,
        }));
      }

      if (place.addressComponents && Array.isArray(place.addressComponents)) {
        candidate.addressComponents = place.addressComponents;
      }

      if (place.types && Array.isArray(place.types)) {
        candidate.types = place.types;
      }

      if (place.primaryType) {
        candidate.primaryType = place.primaryType;
      }

      return candidate;
    });
  } catch (error) {
    console.error("Places API error:", error);
    return [];
  }
}

/**
 * Fetch a place by its Google Place ID
 * @param placeId - Google Place ID
 * @returns Candidate object with place data, or null if not found
 */
export async function fetchPlaceById(
  placeId: string
): Promise<Candidate | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  try {
    const fieldMask =
      "displayName,formattedAddress,nationalPhoneNumber,websiteUri,location,id,rating,userRatingCount,businessStatus,priceLevel,regularOpeningHours,currentOpeningHours,photos,addressComponents,types,primaryType";

    // Google Places API (New) GET endpoint format: https://places.googleapis.com/v1/places/{placeId}
    // The placeId from the API response is the full resource name like "places/ChIJ..."
    // Since PLACES_GET_API_URL is "https://places.googleapis.com/v1/places",
    // we need to extract just the ID part (without "places/") to avoid duplication
    let placeIdPart: string;
    if (placeId.startsWith("places/")) {
      // Extract just the ID part after "places/"
      placeIdPart = placeId.replace(/^places\//, "");
    } else {
      // Already just the ID part
      placeIdPart = placeId;
    }

    // Construct URL: https://places.googleapis.com/v1/places/{placeIdPart}
    const url = `${PLACES_GET_API_URL}/${placeIdPart}`;
    console.log("Fetching place:", {
      originalPlaceId: placeId,
      placeIdPart,
      url,
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Places API error: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        // Log more details for debugging
        console.error("Places API error details:", {
          status: response.status,
          url,
          originalPlaceId: placeId,
          placeIdPart,
          error: errorData.error,
        });
      } catch {
        errorMessage = `Places API error: ${
          response.status
        } ${errorText.substring(0, 200)}`;
        console.error("Places API error (unparseable):", {
          status: response.status,
          url,
          originalPlaceId: placeId,
          placeIdPart,
          errorText: errorText.substring(0, 500),
        });
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data) {
      return null;
    }

    // The GET endpoint returns the place directly, not wrapped in a "places" array
    const place = data;

    // Transform Places API response to Candidate format
    const candidate: Candidate = {
      name: place.displayName?.text || "Unknown",
      address: place.formattedAddress || "",
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
      placeId: place.id,
    };

    if (place.nationalPhoneNumber) {
      candidate.phone = place.nationalPhoneNumber;
    }

    if (place.websiteUri) {
      candidate.website = place.websiteUri;
    }

    if (place.rating !== undefined && place.rating !== null) {
      candidate.rating = place.rating;
    }

    if (place.userRatingCount !== undefined && place.userRatingCount !== null) {
      candidate.userRatingCount = place.userRatingCount;
    }

    if (place.businessStatus) {
      candidate.businessStatus = place.businessStatus;
    }

    if (place.priceLevel !== undefined && place.priceLevel !== null) {
      candidate.priceLevel = place.priceLevel;
    }

    if (place.regularOpeningHours) {
      candidate.regularOpeningHours = place.regularOpeningHours;
    }

    if (place.currentOpeningHours) {
      candidate.currentOpeningHours = place.currentOpeningHours;
    }

    if (place.photos && Array.isArray(place.photos)) {
      candidate.photos = place.photos.map((photo: any) => ({
        name: photo.name || "",
        widthPx: photo.widthPx,
        heightPx: photo.heightPx,
      }));
    }

    if (place.addressComponents && Array.isArray(place.addressComponents)) {
      candidate.addressComponents = place.addressComponents;
    }

    if (place.types && Array.isArray(place.types)) {
      candidate.types = place.types;
    }

    if (place.primaryType) {
      candidate.primaryType = place.primaryType;
    }

    return candidate;
  } catch (error) {
    console.error("Places API error:", error);
    if (error instanceof Error) {
      throw error;
    }
    return null;
  }
}

/**
 * Search for flight school candidates in a city/radius
 * @param params - Search parameters (city, radiusKm, optional query)
 * @returns Array of candidates with name, address, phone, website, lat/lng
 */
export async function search(
  params: SearchParams
): Promise<{ center: GeocodeResult; candidates: Candidate[] }> {
  const { city, radiusKm, query } = params;

  // Geocode the city to get center coordinates
  const center = await geocodeCity(city);
  if (!center) {
    throw new Error(`Could not geocode city: ${city}`);
  }

  // Convert radius from km to meters
  const radiusMeters = Math.round(radiusKm * 1000);

  // Search for places
  const candidates = await searchPlaces(center, radiusMeters, query);

  return {
    center,
    candidates,
  };
}
