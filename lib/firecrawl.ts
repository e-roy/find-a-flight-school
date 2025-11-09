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
 * Zod schema for extracting flight school information using AI
 * Used with generateObject for structured output
 */
const EXTRACT_ZOD_SCHEMA = z.object({
  programs: z
    .array(z.string())
    .describe(
      "List of programs offered, e.g., Private Pilot, Instrument, Commercial, CFI"
    ),
  pricing: z
    .array(z.string())
    .describe("Tuition or hourly rates; capture numbers and units"),
  fleet: z.array(z.string()).describe("Aircraft types and counts in the fleet"),
  location: z.string().describe("Address or airport code of the flight school"),
  contact: z.string().describe("Contact information (email or phone)"),
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
 * Extract structured content from a domain using Firecrawl
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
      limit: 50, // Reasonable limit to avoid crawling entire large sites
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

    const crawlResponse = await firecrawl.crawl(url, crawlOptions);

    // Step 2: Extract and combine markdown from all pages
    if (
      !crawlResponse.data ||
      !Array.isArray(crawlResponse.data) ||
      crawlResponse.data.length === 0
    ) {
      console.warn(`[Firecrawl] No pages found in crawl response`);
      return {
        success: false,
        error: "No pages found when crawling the site",
      };
    }

    const markdownParts: string[] = [];
    for (const page of crawlResponse.data) {
      const pageUrl = (page as any).url || (page as any).sourceURL || "unknown";
      const markdown = (page as any).markdown || (page as any).content || "";

      if (markdown) {
        markdownParts.push(`# Page: ${pageUrl}\n\n${markdown}\n\n---\n\n`);
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

    // Step 3: Use AI to extract structured data from combined markdown
    if (!process.env.OPENAI_API_KEY) {
      console.error("[Firecrawl] OPENAI_API_KEY is not configured");
      return {
        success: false,
        error: "OPENAI_API_KEY is not configured",
      };
    }

    const extractionPrompt = `Extract flight school information from the following website content. 
The content is from multiple pages of a flight school website that have been crawled and converted to markdown.

Extract the following information:
- programs: List of training programs offered (e.g., Private Pilot, Instrument, Commercial, CFI, etc.)
- pricing: Tuition or hourly rates with numbers and units
- fleet: Aircraft types and counts in the fleet
- location: Address or airport code of the flight school
- contact: Contact information (email or phone)

If information is not found, use empty arrays for array fields and empty string for string fields.

Website content:
${combinedMarkdown.substring(0, 100000)}`; // Limit to ~100k chars to avoid token limits

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
