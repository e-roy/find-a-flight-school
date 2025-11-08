import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display in the UI
 */
export function formatAsOfDate(date: Date | null): string {
  if (!date) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Check if a fact is outdated (older than threshold days)
 */
export function isFactOutdated(
  asOf: Date | null,
  thresholdDays: number = 180
): boolean {
  if (!asOf) return true;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
  return asOf < thresholdDate;
}

/**
 * Format a fact value for display
 */
export function formatFactValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value.join(", ");
  }
  return JSON.stringify(value);
}
