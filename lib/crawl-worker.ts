import { db } from "@/lib/db";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { snapshots } from "@/db/schema/snapshots";
import { extractFromDomain } from "@/lib/firecrawl";
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
    completed: 0,
    failed: 0,
    retried: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  // Process each job
  for (const job of pendingJobs) {
    results.processed++;

    try {
      // Update status to 'processing'
      await db
        .update(crawlQueue)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(crawlQueue.id, job.id));

      // Call Firecrawl extract
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
      } else {
        // Increment attempts
        const newAttempts = job.attempts + 1;

        if (newAttempts < 2) {
          // Retry: mark as 'pending' with updated scheduled_at
          await db
            .update(crawlQueue)
            .set({
              status: "pending",
              attempts: newAttempts,
              scheduledAt: new Date(), // Reschedule for immediate retry
              updatedAt: new Date(),
            })
            .where(eq(crawlQueue.id, job.id));

          results.retried++;
        } else {
          // Max attempts reached: mark as 'failed'
          await db
            .update(crawlQueue)
            .set({
              status: "failed",
              attempts: newAttempts,
              updatedAt: new Date(),
            })
            .where(eq(crawlQueue.id, job.id));

          results.failed++;
        }

        // Log error for failed extraction
        const errorMessage = extractResult.error || "Unknown extraction error";
        console.error(
          `[Crawl Worker] Extraction failed for job ${job.id}:`,
          errorMessage
        );
        results.errors.push({
          id: job.id,
          error: errorMessage,
        });
      }
    } catch (error) {
      // Handle individual job failures gracefully
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(
        `[Crawl Worker] Exception processing job ${job.id}:`,
        errorMessage
      );
      const newAttempts = job.attempts + 1;

      if (newAttempts < 2) {
        // Retry
        await db
          .update(crawlQueue)
          .set({
            status: "pending",
            attempts: newAttempts,
            scheduledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(crawlQueue.id, job.id));

        results.retried++;
      } else {
        // Max attempts reached
        await db
          .update(crawlQueue)
          .set({
            status: "failed",
            attempts: newAttempts,
            updatedAt: new Date(),
          })
          .where(eq(crawlQueue.id, job.id));

        results.failed++;
      }

      results.errors.push({
        id: job.id,
        error: errorMessage,
      });
    }
  }

  return results;
}
