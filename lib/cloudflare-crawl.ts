/**
 * Cloudflare Browser Rendering crawler.
 *
 * Synchronous "smart select" pipeline: fetch a site's homepage as markdown, rank its
 * links by relevance to the directory data we extract, then fetch only the top-N
 * relevant pages. This feeds the LLM high-signal content (programs/pricing/fleet/
 * financing/contact) while dropping blogs, news, terms, and other noise.
 *
 * Uses the GA /markdown REST endpoint. Returns pages in the shape that
 * `processCrawlResult` (lib/extract.ts) consumes.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!ACCOUNT_ID || !API_TOKEN) {
  console.warn(
    "CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN are not set. Cloudflare crawling will fail."
  );
}

// How many relevant pages (beyond the homepage) to fetch and feed the LLM.
const DEFAULT_SELECT_N = Number(process.env.SELECT_N || 7);

// Pause between page fetches. The REST endpoint's per-minute cap is low;
// back-to-back calls just trade progress for 429 backoffs and 422 render
// failures (observed: rapid-fire crawls silently drop pages).
const PAGE_FETCH_DELAY_MS = 6000;

// Canonical high-value sections — a page whose URL/anchor names one of these is
// almost certainly worth extracting from. Weighted heavily.
const HIGH_VALUE = [
  "pricing", "price", "tuition", "cost", "rates", "fees", "financ",
  "fleet", "aircraft", "airplane", "planes",
  "program", "programs", "training", "course", "courses", "curriculum",
  "location", "locations", "contact", "about", "admission", "admissions",
  "enroll", "enrollment", "learn-to-fly", "private-pilot", "instrument-rating",
  "commercial", "multi-engine", "academy",
];
// The pages most likely to carry the directory data we extract — boosted above
// softer canonical pages like /about or /faq.
const TOP_VALUE = [
  "pricing", "price", "tuition", "cost", "rates", "fees", "financ",
  "fleet", "aircraft", "program", "location", "contact", "enroll", "admission",
];
// Softer signal keywords — presence helps a little, capped so a keyword-stuffed
// deep URL can't outrank a clean canonical page.
const POSITIVE = [
  "program", "training", "course", "lesson", "private", "instrument", "commercial",
  "multi", "engine", "cfi", "cfii", "atp", "sport", "recreational", "pricing", "price",
  "tuition", "cost", "rate", "fee", "financ", "fleet", "aircraft", "airplane", "plane",
  "cessna", "piper", "cirrus", "diamond", "contact", "about", "location", "enroll",
  "admission", "academy", "ground-school", "part-141", "part-61", "141", "61", "fly",
];
// Anything matching these is dropped outright (blogs, legal, social, assets, etc.).
const NEGATIVE = [
  "blog", "news", "article", "/category/", "/tag/", "/page/", "event", "privacy",
  "terms", "policy", "cookie", "cart", "checkout", "login", "sign-in", "signin",
  "account", "gift", "testimonial", "glossary", "press", "/media/", "sitemap",
  "employment", "career", "hiring", "student-login", "wp-content", "facebook.com",
  "instagram.com", "twitter.com", "linkedin.com", "youtube.com", ".jpg", ".png",
  ".svg", ".pdf", "tel:", "mailto:", "livehelpnow",
];

export interface CrawlPage {
  url: string;
  markdown: string;
}

export interface CloudflareCrawlResult {
  success: boolean;
  pages?: CrawlPage[];
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function authHeaders() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * Single-page markdown via the GA /markdown endpoint. Returns the markdown string
 * (empty on failure). Backs off on 429 (the free Browser Rendering tier has a low
 * REST requests/min cap).
 */
async function cfMarkdown(url: string, attempt = 0): Promise<string> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/markdown`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url }),
  });

  if (res.status === 429 && attempt < 5) {
    const wait = 8000 * (attempt + 1);
    console.log(`[Cloudflare] rate limited — waiting ${wait / 1000}s before retrying ${url}`);
    await sleep(wait);
    return cfMarkdown(url, attempt + 1);
  }

  // 422s are transient render failures and 5xx are server hiccups; without a
  // retry a single flaky render silently drops the page from the crawl.
  if ((res.status === 422 || res.status >= 500) && attempt < 2) {
    const wait = 5000;
    console.log(`[Cloudflare] ${res.status} — retrying ${url} in ${wait / 1000}s`);
    await sleep(wait);
    return cfMarkdown(url, attempt + 1);
  }

  const json = await res.json().catch(() => ({}));
  if (typeof json?.result === "string" && json.result.trim()) return json.result;
  if (json?.result?.markdown) return json.result.markdown;

  console.warn(
    `[Cloudflare] empty markdown (${res.status}) for ${url}: ${JSON.stringify(json?.errors ?? json).slice(0, 160)}`
  );
  return "";
}

interface ScoredLink {
  url: string;
  anchor: string;
  score: number;
}

/** Pull same-domain links + anchor text out of a markdown string. */
function extractLinks(markdown: string, baseUrl: string): { url: string; anchor: string }[] {
  const base = new URL(baseUrl);
  const host = base.hostname.replace(/^www\./, "");
  const seen = new Map<string, string>(); // url -> first anchor text
  const re = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    // Some sites encode a `"title"` into the href; strip it.
    const cleaned = m[2].replace(/%20%22.*$/i, "").replace(/%22.*$/i, "");
    let u: URL;
    try {
      u = new URL(cleaned);
    } catch {
      continue;
    }
    if (u.hostname.replace(/^www\./, "") !== host) continue;
    u.hostname = host; // collapse www vs non-www
    u.hash = "";
    u.search = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/"; // dedupe /x and /x/
    const key = u.toString();
    if (!seen.has(key)) seen.set(key, m[1].trim());
  }
  return [...seen.entries()].map(([url, anchor]) => ({ url, anchor }));
}

/** Relevance score for a link. Returns -1 to drop it outright. */
function scoreLink({ url, anchor }: { url: string; anchor: string }): number {
  const path = new URL(url).pathname.toLowerCase();
  const hay = `${path} ${anchor}`.toLowerCase();
  if (NEGATIVE.some((k) => hay.includes(k))) return -1;

  let score = 0;
  // Canonical high-value section is the dominant signal.
  if (HIGH_VALUE.some((k) => hay.includes(k))) score += 4;
  // The money pages get an extra nudge above softer canonical pages.
  if (TOP_VALUE.some((k) => hay.includes(k))) score += 2;
  // Soft keywords help a little, but capped so deep keyword-stuffed URLs can't win.
  const soft = POSITIVE.filter((k) => hay.includes(k)).length;
  score += Math.min(soft, 3) * 0.5;
  // Strongly prefer shallow, canonical pages over deep sub-pages.
  const segments = path.split("/").filter(Boolean);
  const depth = segments.length;
  if (depth <= 1) score += 2;
  else if (depth === 2) score += 0.5;
  else score -= depth - 1; // -2 at depth 3, -3 at depth 4, ...
  // Long hyphenated slugs are almost always blog/news article titles.
  const lastSeg = segments[segments.length - 1] || "";
  if ((lastSeg.match(/-/g) || []).length >= 7) score -= 4;
  return score;
}

/**
 * Crawl a domain: fetch homepage, rank its links, fetch the top-N relevant pages.
 * @returns pages array (homepage first) ready for processCrawlResult, or an error.
 */
export async function crawlDomain(
  domain: string,
  opts?: { selectN?: number }
): Promise<CloudflareCrawlResult> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    return { success: false, error: "Cloudflare credentials are not configured" };
  }

  const selectN = opts?.selectN ?? DEFAULT_SELECT_N;
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    // The homepage is the single point of total failure — one transient miss
    // would otherwise kill the whole crawl, so give it a few attempts.
    let home = "";
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        console.log(`[Cloudflare] homepage empty — retry ${i + 1}/3 for ${url}`);
        await sleep(10000);
      }
      home = await cfMarkdown(url);
      if (home.trim()) break;
    }
    if (!home.trim()) {
      return { success: false, error: "No markdown returned for homepage" };
    }

    const links = extractLinks(home, url);
    const scored: ScoredLink[] = links.map((l) => ({ ...l, score: scoreLink(l) }));
    const picked = scored
      .filter((l) => l.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, selectN);

    // Fetch sequentially and paced to stay under Cloudflare's REST
    // concurrency / rate limit instead of bouncing off it with backoffs.
    const pages: CrawlPage[] = [{ url, markdown: home }];
    for (const link of picked) {
      await sleep(PAGE_FETCH_DELAY_MS);
      const markdown = await cfMarkdown(link.url);
      if (markdown.trim()) pages.push({ url: link.url, markdown });
    }

    console.log(
      `[Cloudflare] ${url}: ${pages.length} pages with content (from ${links.length} links, ${picked.length} ranked)`
    );
    return { success: true, pages };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during Cloudflare crawl";
    console.error(`[Cloudflare] Exception crawling ${url}:`, message);
    return { success: false, error: message };
  }
}
