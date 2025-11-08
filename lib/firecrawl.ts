/**
 * Firecrawl API helper for extracting structured content from domains
 */

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/extract";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
  console.warn(
    "FIRECRAWL_API_KEY environment variable is not set. Firecrawl extraction will fail."
  );
}

/**
 * JSON schema for extracting flight school information
 */
const EXTRACT_SCHEMA = {
  fields: {
    programs: [
      {
        type: "string",
        description: "e.g., Private Pilot, Instrument, Commercial, CFI",
      },
    ],
    pricing: [
      {
        type: "string",
        description: "tuition or hourly rates; capture numbers + units",
      },
    ],
    fleet: [
      { type: "string", description: "aircraft types and counts" },
    ],
    location: {
      type: "string",
      description: "address or airport code",
    },
    contact: {
      type: "string",
      description: "email/phone",
    },
  },
};

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
    return {
      success: false,
      error: "FIRECRAWL_API_KEY is not configured",
    };
  }

  // Ensure domain has protocol
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        extractorOptions: {
          extractionSchema: EXTRACT_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Firecrawl API error: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();

    // Firecrawl response structure may vary; handle common patterns
    if (data.success === false) {
      return {
        success: false,
        error: data.error || "Unknown Firecrawl error",
      };
    }

    // Extract confidence from response if available
    const confidence =
      data.data?.confidence ??
      data.confidence ??
      (data.data?.extracted ? 0.5 : undefined);

    return {
      success: true,
      data: {
        extracted: data.data?.extracted || data.extracted || {},
        confidence,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error calling Firecrawl API",
    };
  }
}

