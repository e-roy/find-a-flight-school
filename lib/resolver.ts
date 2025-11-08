/**
 * Domain resolver for seed candidates
 * Tries common domain patterns and validates matches with confidence scoring
 */

export interface ResolveInput {
  name: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
}

export interface ResolveResult {
  domain: string | null;
  confidence: number;
  evidence: {
    title: string;
    sourceUrl: string;
    matchedFields: string[];
  } | null;
}

/**
 * Sanitize name for domain generation
 * Removes special chars, converts to lowercase, replaces spaces with hyphens
 */
function sanitizeForDomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate domain candidates to try
 */
function generateDomainCandidates(sanitizedName: string): string[] {
  const candidates: string[] = [];
  
  if (sanitizedName) {
    candidates.push(`${sanitizedName}.com`);
    candidates.push(`${sanitizedName}flightschool.com`);
    candidates.push(`${sanitizedName}flight.com`);
    candidates.push(`${sanitizedName}aviation.com`);
  }
  
  return candidates;
}

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Extract phone number from text
 * Looks for common phone patterns
 */
function extractPhoneFromText(text: string): string | null {
  // Match common phone patterns: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX, etc.
  const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const match = text.match(phoneRegex);
  if (match && match[0]) {
    return normalizePhone(match[0]);
  }
  return null;
}

/**
 * Check if phone numbers match (normalized)
 */
function phonesMatch(phone1: string | null, phone2: string | null): boolean {
  if (!phone1 || !phone2) return false;
  return normalizePhone(phone1) === normalizePhone(phone2);
}

/**
 * Check if location is mentioned in text
 */
function locationMentioned(text: string, city?: string | null, state?: string | null): boolean {
  const lowerText = text.toLowerCase();
  if (city && lowerText.includes(city.toLowerCase())) return true;
  if (state && lowerText.includes(state.toLowerCase())) return true;
  return false;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  
  // Try OG title
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    return ogTitleMatch[1].trim();
  }
  
  return "";
}

/**
 * Check if name appears in title (fuzzy match)
 */
function nameInTitle(title: string, name: string): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerName = name.toLowerCase();
  
  // Exact match
  if (lowerTitle.includes(lowerName)) return true;
  
  // Check if key words from name appear
  const nameWords = lowerName.split(/\s+/).filter(w => w.length > 3);
  if (nameWords.length === 0) return false;
  
  const matchingWords = nameWords.filter(word => lowerTitle.includes(word));
  // At least 50% of significant words should match
  return matchingWords.length >= Math.ceil(nameWords.length * 0.5);
}

/**
 * Fetch URL with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FlightSchoolResolver/1.0)",
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout");
    }
    throw error;
  }
}

/**
 * Resolve domain for a seed candidate
 */
export async function resolveDomain(input: ResolveInput): Promise<ResolveResult> {
  const { name, city, state, phone } = input;
  
  // Skip if already has high confidence
  // (This check is done at the API level, but included for completeness)
  
  const sanitizedName = sanitizeForDomain(name);
  if (!sanitizedName) {
    return {
      domain: null,
      confidence: 0,
      evidence: null,
    };
  }
  
  const candidates = generateDomainCandidates(sanitizedName);
  let bestResult: ResolveResult = {
    domain: null,
    confidence: 0,
    evidence: null,
  };
  
  for (const candidateDomain of candidates) {
    try {
      const url = `https://${candidateDomain}`;
      const html = await fetchWithTimeout(url, 5000);
      
      const title = extractTitle(html);
      if (!title) {
        // No title found, likely not a valid page
        continue;
      }
      
      // Calculate confidence
      let confidence = 0;
      const matchedFields: string[] = [];
      
      // Domain match (base confidence for trying the pattern)
      confidence += 0.3;
      matchedFields.push("domain_pattern");
      
      // Title/name match
      if (nameInTitle(title, name)) {
        confidence += 0.4;
        matchedFields.push("title");
      }
      
      // Phone match
      if (phone) {
        const extractedPhone = extractPhoneFromText(html);
        if (extractedPhone && phonesMatch(phone, extractedPhone)) {
          confidence += 0.2;
          matchedFields.push("phone");
        }
      }
      
      // Location match
      if (locationMentioned(html, city, state)) {
        confidence += 0.1;
        matchedFields.push("location");
      }
      
      // Only consider if confidence is meaningful (at least domain + title)
      if (confidence >= 0.7 && matchedFields.includes("title")) {
        if (confidence > bestResult.confidence) {
          bestResult = {
            domain: candidateDomain,
            confidence,
            evidence: {
              title,
              sourceUrl: url,
              matchedFields,
            },
          };
        }
      }
    } catch (error) {
      // Continue to next candidate on error
      continue;
    }
  }
  
  return bestResult;
}

