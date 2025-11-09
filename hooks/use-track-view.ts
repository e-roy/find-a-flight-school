/**
 * Custom hook for tracking school profile views
 */

import { useEffect } from "react";

/**
 * Track a profile view for a school (fire and forget)
 */
export function useTrackView(schoolId: string | undefined): void {
  useEffect(() => {
    if (schoolId) {
      // Log view event (fire and forget)
      fetch("/api/events/view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId }),
      }).catch((err) => {
        // Silently fail - view tracking should not block the page
        console.error("Failed to track view:", err);
      });
    }
  }, [schoolId]);
}

