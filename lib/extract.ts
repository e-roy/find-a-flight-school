/**
 * Source-neutral structured extraction.
 *
 * Takes crawled pages (markdown) from any crawler and uses an LLM to extract the
 * flight-school fields stored in `snapshots.rawJson`. Kept independent of how the
 * pages were fetched (Cloudflare Browser Rendering, etc.).
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * A crawled page. Only `markdown` (or one of its aliases) and a URL are used.
 */
export interface ExtractPage {
  url?: string;
  sourceURL?: string;
  link?: string;
  markdown?: string;
  content?: string;
  text?: string;
}

/**
 * Zod schema for extracting flight school information using AI.
 * Defines the exact shape stored in snapshots.rawJson and consumed downstream
 * (lib/normalize.ts, lib/utils-snapshot.ts, ScrapedDataSection, etc.).
 */
const EXTRACT_ZOD_SCHEMA = z.object({
  // Existing fields (kept for backward compatibility)
  programs: z
    .array(z.string())
    .describe(
      "List of training programs offered, e.g., Private Pilot, Instrument, Commercial, CFI, CFII, Multi-Engine, etc."
    ),
  pricing: z
    .array(z.string())
    .describe(
      "Tuition or hourly rates; capture numbers and units (e.g., '$150/hour', '$15,000 total')"
    ),
  fleet: z
    .array(z.string())
    .describe(
      "Aircraft types and counts in the fleet (e.g., '2x Cessna 172', '1x Piper Arrow')"
    ),
  location: z
    .string()
    .nullish()
    .describe(
      "Primary address or airport code of the flight school (for backward compatibility)"
    ),
  contact: z
    .string()
    .nullish()
    .describe(
      "Contact information (email or phone) - use if email/phone fields are not available separately"
    ),

  // New: Separate contact fields
  email: z
    .union([z.string().email(), z.literal("")])
    .nullish()
    .describe("Contact email address"),
  phone: z.string().nullish().describe("Contact phone number"),

  // New: Multiple locations
  locations: z
    .array(
      z.object({
        address: z.string().describe("Full address of the location"),
        airportCode: z
          .string()
          .nullish()
          .describe("Airport code (e.g., 'KORD', 'KJFK')"),
        city: z.string().nullish().describe("City name"),
        state: z
          .string()
          .nullish()
          .describe("State abbreviation (e.g., 'CA', 'TX')"),
      })
    )
    .nullish()
    .describe(
      "Multiple locations if the school operates at more than one airport/location"
    ),

  // New: Financing information
  financingAvailable: z
    .boolean()
    .nullish()
    .describe("Whether the school offers financing options"),
  financingUrl: z
    .union([z.string().url(), z.literal("")])
    .nullish()
    .describe("URL to the financing page or application"),
  financingTypes: z
    .array(z.string())
    .nullish()
    .describe(
      "Types of financing available, e.g., ['VA', 'lender', 'scholarship', 'payment plans']"
    ),

  // New: Training type
  trainingType: z
    .array(z.string())
    .nullish()
    .describe("Training types offered, e.g., ['Part 61', 'Part 141']"),

  // New: Simulator availability
  simulatorAvailable: z
    .boolean()
    .nullish()
    .describe("Whether the school has flight simulators available"),

  // New: Instructor count
  instructorCount: z
    .string()
    .nullish()
    .describe("Number of instructors (as string, e.g., '5', '10+')"),

  // New: Typical timeline
  typicalTimeline: z
    .object({
      minMonths: z
        .number()
        .nullish()
        .describe("Minimum months to complete primary program"),
      maxMonths: z
        .number()
        .nullish()
        .describe("Maximum months to complete primary program"),
    })
    .nullish()
    .describe("Typical completion timeline for primary training program"),

  // New: Site status
  siteStatus: z
    .enum(["active", "404", "down", "error", "unknown"])
    .nullish()
    .describe(
      "Status of the website - '404' if page not found, 'down' if site unavailable, 'active' if normal, 'error' for other errors"
    ),
});

export interface ExtractResponse {
  success: boolean;
  data?: {
    extracted: Record<string, unknown>;
    confidence?: number;
  };
  error?: string;
}

/**
 * Process crawled pages and extract structured information using AI.
 * @param crawlData - Array of crawled pages (with markdown content)
 * @returns Extracted data with confidence score, or error on failure
 */
export async function processCrawlResult(
  crawlData: ExtractPage[]
): Promise<ExtractResponse> {
  // Step 1: Extract and combine markdown from all pages
  if (!crawlData || !Array.isArray(crawlData) || crawlData.length === 0) {
    console.warn(`[Extract] No pages found in crawl data`);
    return {
      success: false,
      error: "No pages found when crawling the site",
    };
  }

  const markdownParts: string[] = [];
  for (const page of crawlData) {
    // Handle different page structures - could be nested or flat
    const pageObj: ExtractPage = page && typeof page === "object" ? page : {};
    const pageUrl =
      pageObj.url ?? pageObj.sourceURL ?? pageObj.link ?? "unknown";

    // Try multiple possible markdown fields
    const markdown = pageObj.markdown ?? pageObj.content ?? pageObj.text ?? "";

    if (
      markdown &&
      typeof markdown === "string" &&
      markdown.trim().length > 0
    ) {
      markdownParts.push(`# Page: ${pageUrl}\n\n${markdown}\n\n---\n\n`);
    } else {
      // Log for debugging if we have a page but no markdown
      console.log(`[Extract] Page has no markdown content:`, {
        hasPage: !!page,
        pageKeys:
          page && typeof page === "object"
            ? Object.keys(page)
            : "not an object",
        pageUrl,
      });
    }
  }

  if (markdownParts.length === 0) {
    console.warn(`[Extract] No markdown content found in crawled pages`);
    return {
      success: false,
      error: "No markdown content found in crawled pages",
    };
  }

  const combinedMarkdown = markdownParts.join("\n\n");

  // Step 2: Use AI to extract structured data from combined markdown
  if (!process.env.OPENAI_API_KEY) {
    console.error("[Extract] OPENAI_API_KEY is not configured");
    return {
      success: false,
      error: "OPENAI_API_KEY is not configured",
    };
  }

  // Detect 404/error pages before extraction
  const is404Page =
    combinedMarkdown.toLowerCase().includes("404") ||
    combinedMarkdown.toLowerCase().includes("page not found") ||
    combinedMarkdown.toLowerCase().includes("not found") ||
    combinedMarkdown.toLowerCase().includes("error 404") ||
    combinedMarkdown.toLowerCase().includes("this page doesn't exist");

  const extractionPrompt = `Extract flight school information from the following website content.
The content is from multiple pages of a flight school website that have been crawled and converted to markdown.

IMPORTANT: If the content indicates a 404 error, "PAGE NOT FOUND", or similar error page, set siteStatus to "404" and extract whatever minimal information is available.

Extract the following information:
- programs: List of training programs offered (e.g., Private Pilot, Instrument, Commercial, CFI, CFII, Multi-Engine, etc.)
- pricing: Tuition or hourly rates with numbers and units (e.g., "$150/hour", "$15,000 total program cost")
- fleet: Aircraft types and counts in the fleet (e.g., "2x Cessna 172", "1x Piper Arrow")
- location: Primary address or airport code (for backward compatibility)
- email: Contact email address (extract separately from phone)
- phone: Contact phone number (extract separately from email)
- locations: Array of all locations if school operates at multiple airports/locations (each with address, airportCode, city, state)
- financingAvailable: Whether financing is offered (true/false)
- financingUrl: URL to financing page if mentioned
- financingTypes: Types of financing (e.g., ["VA", "lender", "scholarship", "payment plans"])
- trainingType: Training types offered (e.g., ["Part 61", "Part 141"])
- simulatorAvailable: Whether flight simulators are available (true/false)
- instructorCount: Number of instructors (as string, e.g., "5", "10+")
- typicalTimeline: Object with minMonths and maxMonths for primary program completion
- siteStatus: "active" if normal, "404" if page not found, "down" if site unavailable, "error" for other errors

If information is not found, use:
- Empty arrays [] for array fields
- Empty string "" or null for optional string fields
- false for optional boolean fields
- null for optional object fields

Website content:
${combinedMarkdown.substring(0, 100000)}`; // Limit to ~100k chars to avoid token limits

  try {
    const aiResponse = await generateObject({
      model: openai("gpt-5.4-nano"),
      schema: EXTRACT_ZOD_SCHEMA,
      prompt: extractionPrompt,
      // Note: no `temperature` — reasoning models (gpt-5.x) don't support it.
      // Disable OpenAI strict structured outputs: our schema has many optional
      // fields, which strict mode rejects (it requires every key in `required`).
      providerOptions: {
        openai: {
          strictJsonSchema: false,
        },
      },
    });

    // Convert Zod schema result to our expected format
    const extractedData = aiResponse.object as Record<string, unknown>;

    // Check if we got any actual data
    if (!extractedData || Object.keys(extractedData).length === 0) {
      console.warn(`[Extract] No data extracted by AI`);
      return {
        success: false,
        error: "No data extracted by AI from crawled content",
      };
    }

    // Ensure siteStatus is set if we detected a 404
    if (is404Page && !extractedData.siteStatus) {
      extractedData.siteStatus = "404";
      console.log(`[Extract] Detected 404 page, setting siteStatus to "404"`);
    }

    // Always return success for 404 pages so snapshot is created
    // This allows tracking of site availability issues
    const shouldCreateSnapshot =
      extractedData.siteStatus === "404" ||
      Object.keys(extractedData).length > 0;

    if (!shouldCreateSnapshot) {
      return {
        success: false,
        error: "No extractable data found",
      };
    }

    return {
      success: true,
      data: {
        extracted: extractedData,
        confidence: undefined, // AI extraction doesn't provide confidence scores
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during AI extraction";
    console.error(`[Extract] Exception during AI extraction:`, errorMessage);
    console.error(`[Extract] Error details:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
