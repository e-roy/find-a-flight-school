"use server";

import { db } from "@/lib/db";
import { seedCandidates } from "@/db/schema/seeds";
import { SeedRowSchema } from "@/lib/validation";
import { z } from "zod";

interface UploadResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Simple CSV parser that handles quoted fields
 */
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  const rows = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (const row of rows) {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    // Add last field
    fields.push(currentField.trim());
    lines.push(fields);
  }

  return lines;
}

/**
 * Parse CSV header row and return field indices
 */
function parseHeader(headerRow: string[]): Record<string, number> {
  const indices: Record<string, number> = {};
  headerRow.forEach((field, index) => {
    const normalized = field.trim().toLowerCase();
    indices[normalized] = index;
  });
  return indices;
}

/**
 * Convert CSV row to object using header indices
 */
function rowToObject(
  row: string[],
  headerIndices: Record<string, number>
): Record<string, string> {
  const obj: Record<string, string> = {};
  Object.entries(headerIndices).forEach(([key, index]) => {
    // Handle rows with fewer columns than headers
    obj[key] = index < row.length ? row[index]?.trim() || "" : "";
  });
  return obj;
}

export async function uploadSeeds(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File | null;

  if (!file) {
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      errors: [{ row: 0, error: "No file provided" }],
    };
  }

  try {
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        errors: [
          { row: 0, error: "CSV must have at least a header and one data row" },
        ],
      };
    }

    const headerRow = rows[0];
    const headerIndices = parseHeader(headerRow);
    const dataRows = rows.slice(1);

    // Validate required headers exist
    if (headerIndices.name === undefined || headerIndices.city === undefined) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        errors: [{ row: 0, error: "CSV must have 'name' and 'city' columns" }],
      };
    }

    const errors: Array<{ row: number; error: string }> = [];
    const validRows: Array<{
      id: string;
      name: string;
      city: string;
      state: string | null;
      country: string | null;
      phone: string | null;
      website: string | null;
      resolutionMethod: string | null;
      confidence: number | null;
      firstSeenAt: Date;
      lastSeenAt: Date;
    }> = [];

    // Process each data row
    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = i + 2; // +2 because header is row 1, and we're 0-indexed
      const row = dataRows[i];

      try {
        const rowObj = rowToObject(row, headerIndices);
        const validated = SeedRowSchema.parse(rowObj);

        const hasWebsite = validated.website && validated.website.length > 0;

        validRows.push({
          id: crypto.randomUUID(),
          name: validated.name,
          city: validated.city,
          state: validated.state || null,
          country: validated.country || null,
          phone: validated.phone || null,
          website: validated.website || null,
          resolutionMethod: hasWebsite ? "manual" : null,
          confidence: hasWebsite ? 1 : null,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push({
            row: rowIndex,
            error: error.issues
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", "),
          });
        } else {
          errors.push({
            row: rowIndex,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Insert valid rows
    if (validRows.length > 0) {
      await db.insert(seedCandidates).values(validRows);
    }

    return {
      success: true,
      inserted: validRows.length,
      skipped: errors.length,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      errors: [
        {
          row: 0,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ],
    };
  }
}
