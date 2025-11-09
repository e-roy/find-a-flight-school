/**
 * Utilities for handling photo URLs, including Google Places photo references
 */

interface GooglePlacesPhoto {
  name: string;
  widthPx?: number;
  heightPx?: number;
}

/**
 * Convert Google Places photo reference to a URL
 * Uses our API route to proxy the image (to keep API key server-side)
 */
export function getPhotoUrl(
  photo: string | GooglePlacesPhoto | undefined | null
): string | null {
  if (!photo) {
    return null;
  }

  // If it's already a URL string, return it
  if (typeof photo === "string") {
    // Check if it's a valid URL
    if (photo.startsWith("http://") || photo.startsWith("https://")) {
      return photo;
    }
    // If it's a Google Places photo reference string (like "places/...")
    if (photo.startsWith("places/")) {
      return `/api/photos/google?name=${encodeURIComponent(photo)}`;
    }
    // Empty string or invalid
    return null;
  }

  // If it's a Google Places photo object
  if (typeof photo === "object" && photo !== null && "name" in photo) {
    const photoObj = photo as GooglePlacesPhoto;
    if (photoObj.name && typeof photoObj.name === "string") {
      return `/api/photos/google?name=${encodeURIComponent(photoObj.name)}`;
    }
  }

  return null;
}

/**
 * Extract photo URLs from an array of photos (handles mixed formats)
 */
export function extractPhotoUrls(
  photos: unknown
): string[] {
  if (!photos || !Array.isArray(photos)) {
    return [];
  }

  const urls: string[] = [];
  for (const photo of photos) {
    const url = getPhotoUrl(photo);
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

