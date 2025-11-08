import { db } from "@/lib/db";
import { eventsViews } from "@/db/schema/events_views";
import { eventsFinancing } from "@/db/schema/events_financing";
import { eventsMatchAppearances } from "@/db/schema/events_match_appearances";
import { randomUUID } from "node:crypto";

export type EventType = "profile_view" | "financing_click" | "match_appearance";

interface LogEventOptions {
  userSessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a non-PII event to the database.
 * Supports profile views, financing clicks, and match appearances.
 */
export async function logEvent(
  eventType: EventType,
  schoolId: string,
  options?: LogEventOptions
): Promise<void> {
  const eventId = randomUUID();
  const userSessionId = options?.userSessionId || randomUUID();

  try {
    switch (eventType) {
      case "profile_view": {
        await db.insert(eventsViews).values({
          id: eventId,
          schoolId,
          userSessionId,
          createdAt: new Date(),
        });
        break;
      }
      case "financing_click": {
        // Financing clicks are already handled by the /api/financing/intent endpoint
        // This is here for consistency but may not be used directly
        await db.insert(eventsFinancing).values({
          id: eventId,
          schoolId,
          userSessionId,
          createdAt: new Date(),
        });
        break;
      }
      case "match_appearance": {
        await db.insert(eventsMatchAppearances).values({
          id: eventId,
          schoolId,
          userSessionId,
          createdAt: new Date(),
        });
        break;
      }
      default:
        console.warn(`Unknown event type: ${eventType}`);
    }
  } catch (error) {
    // Log errors but don't throw - event tracking should be non-blocking
    console.error(`Failed to log event ${eventType} for school ${schoolId}:`, error);
  }
}

