/**
 * Firecrawl API helper for extracting structured content from domains
 * Uses the @mendable/firecrawl-js SDK to crawl sites and AI to extract data
 */

import Firecrawl from "@mendable/firecrawl-js";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
  console.warn(
    "FIRECRAWL_API_KEY environment variable is not set. Firecrawl extraction will fail."
  );
}

// Initialize Firecrawl instance (lazy initialization)
let firecrawlInstance: Firecrawl | null = null;

function getFirecrawlInstance(): Firecrawl {
  if (!firecrawlInstance) {
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }
    firecrawlInstance = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
  }
  return firecrawlInstance;
}

/**
 * TypeScript interfaces for Firecrawl data structures
 */
interface FirecrawlPage {
  url?: string;
  sourceURL?: string;
  link?: string;
  markdown?: string;
  content?: string;
  text?: string;
  [key: string]: unknown; // Allow additional properties
}

interface FirecrawlCrawlResponse {
  jobId?: string;
  id?: string;
  job?: {
    id?: string;
  };
  data?: FirecrawlPage[];
  [key: string]: unknown; // Allow additional properties
}

/**
 * Zod schema for extracting flight school information using AI
 * Used with generateObject for structured output
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
    .optional()
    .describe(
      "Primary address or airport code of the flight school (for backward compatibility)"
    ),
  contact: z
    .string()
    .optional()
    .describe(
      "Contact information (email or phone) - use if email/phone fields are not available separately"
    ),

  // New: Separate contact fields
  email: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .describe("Contact email address"),
  phone: z.string().optional().describe("Contact phone number"),

  // New: Multiple locations
  locations: z
    .array(
      z.object({
        address: z.string().describe("Full address of the location"),
        airportCode: z
          .string()
          .optional()
          .describe("Airport code (e.g., 'KORD', 'KJFK')"),
        city: z.string().optional().describe("City name"),
        state: z
          .string()
          .optional()
          .describe("State abbreviation (e.g., 'CA', 'TX')"),
      })
    )
    .optional()
    .describe(
      "Multiple locations if the school operates at more than one airport/location"
    ),

  // New: Financing information
  financingAvailable: z
    .boolean()
    .optional()
    .describe("Whether the school offers financing options"),
  financingUrl: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .describe("URL to the financing page or application"),
  financingTypes: z
    .array(z.string())
    .optional()
    .describe(
      "Types of financing available, e.g., ['VA', 'lender', 'scholarship', 'payment plans']"
    ),

  // New: Training type
  trainingType: z
    .array(z.string())
    .optional()
    .describe("Training types offered, e.g., ['Part 61', 'Part 141']"),

  // New: Simulator availability
  simulatorAvailable: z
    .boolean()
    .optional()
    .describe("Whether the school has flight simulators available"),

  // New: Instructor count
  instructorCount: z
    .string()
    .optional()
    .describe("Number of instructors (as string, e.g., '5', '10+')"),

  // New: Typical timeline
  typicalTimeline: z
    .object({
      minMonths: z
        .number()
        .optional()
        .describe("Minimum months to complete primary program"),
      maxMonths: z
        .number()
        .optional()
        .describe("Maximum months to complete primary program"),
    })
    .optional()
    .describe("Typical completion timeline for primary training program"),

  // New: Site status
  siteStatus: z
    .enum(["active", "404", "down", "error", "unknown"])
    .optional()
    .describe(
      "Status of the website - '404' if page not found, 'down' if site unavailable, 'active' if normal, 'error' for other errors"
    ),
});

export interface FirecrawlExtractResponse {
  success: boolean;
  data?: {
    extracted: Record<string, unknown>;
    confidence?: number;
  };
  error?: string;
}

/**
 * Process crawled data and extract structured information using AI
 * @param crawlData - Array of crawled pages from Firecrawl
 * @returns Extracted data with confidence score, or error on failure
 */
export async function processCrawlResult(
  crawlData: FirecrawlPage[]
): Promise<FirecrawlExtractResponse> {
  // Step 1: Extract and combine markdown from all pages
  if (!crawlData || !Array.isArray(crawlData) || crawlData.length === 0) {
    console.warn(`[Firecrawl] No pages found in crawl data`);
    return {
      success: false,
      error: "No pages found when crawling the site",
    };
  }

  const markdownParts: string[] = [];
  for (const page of crawlData) {
    // Handle different page structures - could be nested or flat
    const pageObj: FirecrawlPage = page && typeof page === "object" ? page : {};
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
      console.log(`[Firecrawl] Page has no markdown content:`, {
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
    console.warn(`[Firecrawl] No markdown content found in crawled pages`);
    return {
      success: false,
      error: "No markdown content found in crawled pages",
    };
  }

  const combinedMarkdown = markdownParts.join("\n\n");

  // Step 2: Use AI to extract structured data from combined markdown
  if (!process.env.OPENAI_API_KEY) {
    console.error("[Firecrawl] OPENAI_API_KEY is not configured");
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
      model: openai("gpt-4o-mini"),
      schema: EXTRACT_ZOD_SCHEMA,
      prompt: extractionPrompt,
      temperature: 0.1, // Lower temperature for more consistent extraction
    });

    // Convert Zod schema result to our expected format
    const extractedData = aiResponse.object as Record<string, unknown>;

    // Check if we got any actual data
    if (!extractedData || Object.keys(extractedData).length === 0) {
      console.warn(`[Firecrawl] No data extracted by AI`);
      return {
        success: false,
        error: "No data extracted by AI from crawled content",
      };
    }

    // Ensure siteStatus is set if we detected a 404
    if (is404Page && !extractedData.siteStatus) {
      extractedData.siteStatus = "404";
      console.log(`[Firecrawl] Detected 404 page, setting siteStatus to "404"`);
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
    console.error(`[Firecrawl] Exception during AI extraction:`, errorMessage);
    console.error(`[Firecrawl] Error details:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Start an async crawl with webhook callback
 * @param domain - The domain to crawl
 * @param webhookUrl - URL to receive webhook notifications
 * @param metadata - Metadata to include in webhook payload
 * @returns Firecrawl job ID or success status
 */
export async function startAsyncCrawl(
  domain: string,
  webhookUrl: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  if (!FIRECRAWL_API_KEY) {
    return {
      success: false,
      error: "FIRECRAWL_API_KEY is not configured",
    };
  }

  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    const firecrawl = getFirecrawlInstance();

    const crawlOptions = {
      limit: 15, // Reasonable limit to avoid crawling entire large sites
      scrapeOptions: {
        formats: ["markdown"] as (
          | "markdown"
          | "html"
          | "rawHtml"
          | "links"
          | "screenshot"
          | "json"
        )[],
      },
      timeout: 300, // 5 minutes timeout
      webhook: {
        url: webhookUrl,
        metadata: metadata
          ? (Object.fromEntries(
              Object.entries(metadata).map(([k, v]) => [k, String(v)])
            ) as Record<string, string>)
          : {},
        events: ["page", "completed"] as (
          | "started"
          | "page"
          | "completed"
          | "failed"
        )[],
      },
    };

    // Start async crawl - this returns immediately
    // Note: The Firecrawl SDK may return a job ID or may handle webhooks differently
    // Check the actual SDK response structure
    const response = (await firecrawl.crawl(
      url,
      crawlOptions
    )) as unknown as FirecrawlCrawlResponse;

    // Extract job ID if available (structure may vary by SDK version)
    const jobId =
      response.jobId ?? response.id ?? response.job?.id ?? undefined;

    return {
      success: true,
      jobId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Firecrawl] Error starting async crawl:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Extract structured content from a domain using Firecrawl (synchronous)
 * @deprecated Consider using startAsyncCrawl with webhooks for better reliability
 * @param domain - The domain to extract from (e.g., "example.com")
 * @returns Extracted data with confidence score, or null on failure
 */
export async function extractFromDomain(
  domain: string
): Promise<FirecrawlExtractResponse> {
  if (!FIRECRAWL_API_KEY) {
    console.error("[Firecrawl] FIRECRAWL_API_KEY is not configured");
    return {
      success: false,
      error: "FIRECRAWL_API_KEY is not configured",
    };
  }

  // Ensure domain has protocol
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    // Step 1: Crawl the site to get all pages in markdown
    const firecrawl = getFirecrawlInstance();

    const crawlOptions = {
      limit: 15, // Reasonable limit to avoid crawling entire large sites
      scrapeOptions: {
        formats: ["markdown"] as (
          | "markdown"
          | "html"
          | "rawHtml"
          | "links"
          | "screenshot"
          | "json"
        )[],
      },
      timeout: 300, // 5 minutes timeout
    };

    const crawlResponse = (await firecrawl.crawl(
      url,
      crawlOptions
    )) as unknown as FirecrawlCrawlResponse;

    // Process the crawl result using the shared function
    return await processCrawlResult(crawlResponse.data || []);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during crawl or extraction";
    console.error(
      `[Firecrawl] Exception during crawl/extraction:`,
      errorMessage
    );
    console.error(`[Firecrawl] Error details:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
