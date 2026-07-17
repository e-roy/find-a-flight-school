/**
 * How long a crawl_queue row may sit in `pending`/`processing` before it is
 * treated as dead (server restarted mid-crawl) rather than actively crawling.
 * Shared by the admin UI (status display) and the crawl routers (duplicate-crawl
 * guard) so both sides agree on when a stuck crawl becomes re-triggerable.
 * Client-safe: no server imports.
 */
export const STALE_CRAWL_MS = 15 * 60 * 1000;
