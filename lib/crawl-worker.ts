import { db } from "@/lib/db";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { snapshots } from "@/db/schema/snapshots";
import { startAsyncCrawl, extractFromDomain } from "@/lib/firecrawl";
import { eq, asc } from "drizzle-orm";

export async function processCrawlQueue(limit: number = 20) {
  // Pick up to limit pending jobs (ordered by scheduled_at)
  const pendingJobs = await db
    .select()
    .from(crawlQueue)
    .where(eq(crawlQueue.status, "pending"))
    .orderBy(asc(crawlQueue.scheduledAt))
    .limit(limit);

  const results = {
    processed: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  // Construct webhook URL
  // Use WEBHOOK_BASE_URL if set (for ngrok/testing), otherwise use NEXTAUTH_URL or VERCEL_URL
  // This allows testing webhooks without breaking authentication (NEXTAUTH_URL stays for auth)
  const webhookBaseUrl =
    process.env.WEBHOOK_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const webhookUrl = `${webhookBaseUrl}/api/crawl/webhook`;

  // Check if webhook URL is publicly accessible (not localhost in production)
  const isLocalhost =
    webhookBaseUrl.includes("localhost") ||
    webhookBaseUrl.includes("127.0.0.1");
  const useWebhook = !isLocalhost || process.env.FORCE_WEBHOOK === "true";

  // Process each job
  for (const job of pendingJobs) {
    results.processed++;

    try {
      // In development with localhost, use synchronous mode as fallback
      if (!useWebhook) {
        console.log(
          `[Crawl Worker] Using synchronous mode for local development (job ${job.id})`
        );
        console.log(
          `[Crawl Worker] Tip: Set WEBHOOK_BASE_URL to an ngrok URL (e.g., https://abc123.ngrok.io) or FORCE_WEBHOOK=true to test webhooks`
        );

        // Update status to 'processing'
        await db
          .update(crawlQueue)
          .set({
            status: "processing",
            updatedAt: new Date(),
          })
          .where(eq(crawlQueue.id, job.id));

        // Call Firecrawl extract synchronously
        const extractResult = await extractFromDomain(job.domain);

        if (extractResult.success && extractResult.data) {
          // Create snapshot with raw_json and extract_confidence
          const snapshotId = crypto.randomUUID();

          await db.insert(snapshots).values({
            id: snapshotId,
            schoolId: job.schoolId,
            domain: job.domain,
            asOf: new Date(),
            rawJson: extractResult.data.extracted,
            extractConfidence: extractResult.data.confidence ?? null,
          });

          // Mark job as 'completed'
          await db
            .update(crawlQueue)
            .set({
              status: "completed",
              updatedAt: new Date(),
            })
            .where(eq(crawlQueue.id, job.id));

          results.completed++;
          console.log(
            `[Crawl Worker] Successfully completed crawl job ${job.id} for domain ${job.domain}`
          );
        } else {
          // Extraction failed - mark as failed immediately (no retry)
          await db
            .update(crawlQueue)
            .set({
              status: "failed",
              attempts: job.attempts + 1,
              updatedAt: new Date(),
            })
            .where(eq(crawlQueue.id, job.id));

          results.failed++;
          const errorMessage =
            extractResult.error || "Unknown extraction error";
          console.error(
            `[Crawl Worker] Extraction failed for job ${job.id}:`,
            errorMessage
          );
          results.errors.push({
            id: job.id,
            error: errorMessage,
          });
        }
      } else {
        // Submit to Firecrawl asynchronously with webhook
        console.log(
          `[Crawl Worker] Submitting async crawl with webhook for job ${job.id} (webhook: ${webhookUrl})`
        );
        const result = await startAsyncCrawl(job.domain, webhookUrl, {
          queueId: job.id,
          schoolId: job.schoolId,
          domain: job.domain,
        });

        if (result.success) {
          // Update status to 'queued' (waiting for Firecrawl webhook)
          await db
            .update(crawlQueue)
            .set({
              status: "queued",
              firecrawlJobId: result.jobId || null,
              updatedAt: new Date(),
            })
            .where(eq(crawlQueue.id, job.id));

          results.queued++;
          console.log(
            `[Crawl Worker] Successfully queued crawl job ${job.id} for domain ${job.domain}`
          );
        } else {
          // Failed to submit - mark as failed immediately (no retry)
          await db
            .update(crawlQueue)
            .set({
              status: "failed",
              attempts: job.attempts + 1,
              updatedAt: new Date(),
            })
            .where(eq(crawlQueue.id, job.id));

          results.failed++;
          const errorMessage = result.error || "Failed to submit crawl job";
          console.error(
            `[Crawl Worker] Failed to queue job ${job.id}:`,
            errorMessage
          );
          results.errors.push({
            id: job.id,
            error: errorMessage,
          });
        }
      }
    } catch (error) {
      // Handle individual job failures gracefully - mark as failed immediately (no retry)
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(
        `[Crawl Worker] Exception processing job ${job.id}:`,
        errorMessage
      );

      await db
        .update(crawlQueue)
        .set({
          status: "failed",
          attempts: job.attempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(crawlQueue.id, job.id));

      results.failed++;
      results.errors.push({
        id: job.id,
        error: errorMessage,
      });
    }
  }

  return results;
}
