/**
 * Utilities for handling financing-related operations
 */

import { snapshots } from "@/db/schema/snapshots";

type Snapshot = typeof snapshots.$inferSelect;

export interface FinancingInfo {
  available: true;
  url: string | null;
  types: string[];
}

/**
 * Extract financing information from a snapshot
 */
export function extractFinancingInfo(
  snapshot: Snapshot | null | undefined
): FinancingInfo | null {
  if (!snapshot?.rawJson) {
    return null;
  }
  const snapshotData = snapshot.rawJson as Record<string, unknown>;
  // Check both 'financing' and 'financingAvailable' fields
  const financing =
    typeof snapshotData.financing === "boolean"
      ? snapshotData.financing
      : typeof snapshotData.financingAvailable === "boolean"
      ? snapshotData.financingAvailable
      : null;

  return financing === true
    ? {
        available: true,
        url:
          typeof snapshotData.financingUrl === "string"
            ? snapshotData.financingUrl
            : null,
        types: Array.isArray(snapshotData.financingTypes)
          ? (snapshotData.financingTypes as string[])
          : [],
      }
    : null;
}

export interface FinancingIntentCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

/**
 * Submit financing intent for a school
 */
export async function submitFinancingIntent(
  schoolId: string,
  callbacks?: FinancingIntentCallbacks
): Promise<void> {
  try {
    const response = await fetch("/api/financing/intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ schoolId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "Failed to submit financing intent"
      );
    }

    callbacks?.onSuccess?.();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error submitting financing intent:", err);
    callbacks?.onError?.(err);
  } finally {
    callbacks?.onFinally?.();
  }
}

