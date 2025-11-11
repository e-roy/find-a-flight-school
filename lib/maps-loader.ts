/**
 * Google Maps JavaScript API loader utility
 * Handles dynamic loading of the Google Maps script with proper TypeScript types
 */

declare global {
  interface Window {
    google?: typeof google;
    initGoogleMaps?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Load Google Maps JavaScript API script
 * @returns Promise that resolves when the script is loaded
 */
export function loadGoogleMaps(): Promise<void> {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Return resolved promise if already loaded
  if (isLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // Check for Maps API key first, then fallback to Places API key
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const placesApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const apiKey = mapsApiKey || placesApiKey;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_PLACES_API_KEY environment variable is not set"
      )
    );
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      // Script exists, check if it's already loaded
      if (window.google?.maps?.Map) {
        isLoaded = true;
        resolve();
        return;
      }

      // Script exists but google.maps not available yet
      // Poll for a short time to see if it becomes available
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.google?.maps?.Map) {
          clearInterval(checkInterval);
          isLoaded = true;
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          // Try adding load listener as fallback
          existingScript.addEventListener("load", () => {
            let fallbackAttempts = 0;
            const fallbackInterval = setInterval(() => {
              fallbackAttempts++;
              if (window.google?.maps?.Map) {
                clearInterval(fallbackInterval);
                isLoaded = true;
                resolve();
              } else if (fallbackAttempts >= 50) {
                clearInterval(fallbackInterval);
                reject(
                  new Error(
                    "Google Maps script loaded but Map constructor not available"
                  )
                );
              }
            }, 100);
          });
          existingScript.addEventListener("error", () => {
            reject(new Error("Failed to load Google Maps script"));
          });
        }
      }, 100);

      // Also listen for load event in case it fires
      existingScript.addEventListener("load", () => {
        clearInterval(checkInterval);
        let loadAttempts = 0;
        const loadCheckInterval = setInterval(() => {
          loadAttempts++;
          if (window.google?.maps?.Map) {
            clearInterval(loadCheckInterval);
            isLoaded = true;
            resolve();
          } else if (loadAttempts >= 50) {
            clearInterval(loadCheckInterval);
            reject(
              new Error(
                "Google Maps script loaded but Map constructor not available"
              )
            );
          }
        }, 100);
      });
      existingScript.addEventListener("error", () => {
        clearInterval(checkInterval);
        reject(new Error("Failed to load Google Maps script"));
      });
      return;
    }

    // Create and append script
    const script = document.createElement("script");
    // Use loading=async parameter to fix the warning
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Wait for Map constructor to be available (needed with loading=async)
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.google?.maps?.Map) {
          clearInterval(checkInterval);
          isLoaded = true;
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(
            new Error(
              "Google Maps script loaded but Map constructor not available"
            )
          );
        }
      }, 100);
    };

    script.onerror = () => {
      reject(
        new Error(
          "Failed to load Google Maps script. Check your API key and network connection."
        )
      );
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Check if Google Maps is loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return isLoaded && !!window.google?.maps;
}
