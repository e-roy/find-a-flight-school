import { db } from "@/lib/db";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { snapshots } from "@/db/schema/snapshots";
import { facts } from "@/db/schema/facts";
import { crawlDomain } from "@/lib/cloudflare-crawl";
import { processCrawlResult } from "@/lib/extract";
import { normalizeSnapshot } from "@/lib/normalize";
import { eq } from "drizzle-orm";

type CrawlJob = typeof crawlQueue.$inferSelect;

export interface CrawlJobResult {
  status: "completed" | "failed";
  error?: string;
  pages?: number;
}

/**
 * Crawl + extract a single queued job synchronously, write a snapshot on success,
 * and update the job's status. Returns a small summary. Never throws — failures are
 * captured in the returned result and the job is marked `failed` (no auto-retry).
 */
export async function processJob(job: CrawlJob): Promise<CrawlJobResult> {
  try {
    await db
      .update(crawlQueue)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(crawlQueue.id, job.id));

    const crawl = await crawlDomain(job.domain);
    if (!crawl.success || !crawl.pages) {
      const error = crawl.error || "Crawl returned no pages";
      await markFailed(job, error);
      return { status: "failed", error };
    }

    const extract = await processCrawlResult(crawl.pages);
    if (extract.success && extract.data) {
      const asOf = new Date();
      await db.insert(snapshots).values({
        id: crypto.randomUUID(),
        schoolId: job.schoolId,
        domain: job.domain,
        asOf,
        rawJson: extract.data.extracted,
        extractConfidence: extract.data.confidence ?? null,
      });
      await publishFacts(job.schoolId, extract.data.extracted, asOf);
      await db
        .update(crawlQueue)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(crawlQueue.id, job.id));
      console.log(`[Crawl] Completed job ${job.id} for ${job.domain}`);
      return { status: "completed", pages: crawl.pages.length };
    }

    const error = extract.error || "Unknown extraction error";
    await markFailed(job, error);
    return { status: "failed", error };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    await markFailed(job, message);
    return { status: "failed", error: message };
  }
}

/**
 * Publish the crawl: normalize the extracted snapshot into CRAWL-provenance
 * facts. Non-fatal — the snapshot is already stored and facts can be re-derived
 * from it, so a normalization failure logs loudly but doesn't fail the crawl.
 */
async function publishFacts(schoolId: string, rawJson: unknown, asOf: Date) {
  try {
    const normalized = normalizeSnapshot(
      rawJson as Record<string, unknown>,
      asOf
    );
    if (normalized.length === 0) return;
    // Offset asOf per row so repeated keys (e.g. one fact per program type)
    // don't collide on the (schoolId, factKey, asOf) primary key.
    const rows = normalized.map((f, i) => ({
      schoolId,
      factKey: f.factKey,
      factValue: f.factValue,
      provenance: "CRAWL" as const,
      asOf: new Date(asOf.getTime() + i),
    }));
    await db.insert(facts).values(rows);
    console.log(`[Crawl] Published ${rows.length} facts for school ${schoolId}`);
  } catch (error) {
    console.error(
      `[Crawl] Failed to publish facts for school ${schoolId} (snapshot saved; facts can be re-derived):`,
      error
    );
  }
}

async function markFailed(job: CrawlJob, error: string) {
  console.error(`[Crawl] Failed job ${job.id} for ${job.domain}: ${error}`);
  await db
    .update(crawlQueue)
    .set({
      status: "failed",
      attempts: job.attempts + 1,
      error: error.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(crawlQueue.id, job.id));
}
