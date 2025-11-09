import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { snapshots } from "@/db/schema/snapshots";
import { processCrawlResult } from "@/lib/firecrawl";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Route config to ensure raw body is available for signature verification
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verify webhook signature from Firecrawl
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  try {
    // Compute expected signature
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const expectedSignatureHex = hmac.digest("hex");
    const expectedSignatureBase64 = hmac.digest("base64");

    // Clean signature - remove common prefixes like "sha256="
    let cleanSignature = signature.trim();
    if (cleanSignature.startsWith("sha256=")) {
      cleanSignature = cleanSignature.substring(7);
    }

    // Try hex comparison first
    try {
      const signatureBuffer = Buffer.from(cleanSignature, "hex");
      const expectedBuffer = Buffer.from(expectedSignatureHex, "hex");

      if (signatureBuffer.length === expectedBuffer.length) {
        return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
      }
    } catch {
      // Not hex, try base64
    }

    // Try base64 comparison
    try {
      const signatureBuffer = Buffer.from(cleanSignature, "base64");
      const expectedBuffer = Buffer.from(expectedSignatureBase64, "base64");

      if (signatureBuffer.length === expectedBuffer.length) {
        return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
      }
    } catch {
      // Not base64 either
    }

    // Try direct string comparison (if signature is already hex/base64 string)
    if (
      cleanSignature === expectedSignatureHex ||
      cleanSignature === expectedSignatureBase64
    ) {
      return true;
    }

    // Log for debugging
    console.log("[Webhook] Signature format mismatch:", {
      receivedLength: cleanSignature.length,
      receivedPrefix: cleanSignature.substring(0, 20),
      expectedHexLength: expectedSignatureHex.length,
      expectedBase64Length: expectedSignatureBase64.length,
    });

    return false;
  } catch (error) {
    console.error("[Webhook] Error verifying signature:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Log request info for debugging (only in production to help diagnose issues)
    const isProduction = process.env.NODE_ENV === "production";

    // Log all headers in production for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    if (isProduction) {
      console.log(
        "[Webhook] Request headers:",
        JSON.stringify(headers, null, 2)
      );
    }

    // Read raw body for signature verification
    // Note: On Vercel, the body might be pre-parsed, so we need to reconstruct it
    const rawBody = await req.text();

    // Log body info for debugging
    if (isProduction) {
      console.log("[Webhook] Raw body length:", rawBody.length);
      console.log(
        "[Webhook] Raw body first 200 chars:",
        rawBody.substring(0, 200)
      );
      console.log("[Webhook] Content-Type:", req.headers.get("content-type"));
    }

    const body = JSON.parse(rawBody);

    // Verify webhook signature - check multiple possible header names
    const signature =
      req.headers.get("X-Firecrawl-Signature") ||
      req.headers.get("x-firecrawl-signature") ||
      req.headers.get("firecrawl-signature") ||
      req.headers.get("X-Signature");

    const webhookSecret = process.env.FIRECRAWL_WEBHOOK_SECRET;

    // Allow bypassing signature verification for testing/debugging
    // In development: SKIP_WEBHOOK_SIGNATURE=true
    // In production (temporary): FORCE_SKIP_WEBHOOK_SIGNATURE=true (use with caution!)
    const isDevelopment = process.env.NODE_ENV === "development";
    const skipSignatureCheck =
      (isDevelopment && process.env.SKIP_WEBHOOK_SIGNATURE === "true") ||
      process.env.FORCE_SKIP_WEBHOOK_SIGNATURE === "true";

    if (!skipSignatureCheck) {
      if (!webhookSecret) {
        console.error("[Webhook] FIRECRAWL_WEBHOOK_SECRET is not configured");
        console.log(
          "[Webhook] Tip: Set SKIP_WEBHOOK_SIGNATURE=true in development to bypass signature check"
        );
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 500 }
        );
      }

      // Try verifying with the raw body as-is
      let isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

      // If verification fails, try with re-stringified body (in case body was modified)
      if (!isValid && isProduction) {
        console.log(
          "[Webhook] First verification attempt failed, trying with re-stringified body..."
        );
        const reStringifiedBody = JSON.stringify(body);
        isValid = verifyWebhookSignature(
          reStringifiedBody,
          signature,
          webhookSecret
        );
        if (isValid) {
          console.log(
            "[Webhook] Verification succeeded with re-stringified body"
          );
        }
      }

      if (!isValid) {
        console.error("[Webhook] Invalid signature after all attempts");
        console.error(
          "[Webhook] Received signature:",
          signature ? `${signature.substring(0, 20)}...` : "none"
        );
        console.error(
          "[Webhook] Signature full length:",
          signature ? signature.length : 0
        );
        console.error("[Webhook] Raw body length:", rawBody.length);
        console.error("[Webhook] Webhook secret configured:", !!webhookSecret);
        console.error(
          "[Webhook] Webhook secret length:",
          webhookSecret ? webhookSecret.length : 0
        );
        console.error(
          "[Webhook] All signature-related headers:",
          JSON.stringify(
            {
              "X-Firecrawl-Signature": req.headers.get("X-Firecrawl-Signature"),
              "x-firecrawl-signature": req.headers.get("x-firecrawl-signature"),
              "firecrawl-signature": req.headers.get("firecrawl-signature"),
              "X-Signature": req.headers.get("X-Signature"),
            },
            null,
            2
          )
        );

        // Compute expected signature for comparison (first 20 chars only for security)
        try {
          const hmac = crypto.createHmac("sha256", webhookSecret);
          hmac.update(rawBody);
          const expectedHex = hmac.digest("hex");
          console.error(
            "[Webhook] Expected signature (hex, first 20 chars):",
            expectedHex.substring(0, 20)
          );
        } catch (e) {
          console.error("[Webhook] Error computing expected signature:", e);
        }

        console.error(
          "[Webhook] Tip: In development, set SKIP_WEBHOOK_SIGNATURE=true to bypass signature check"
        );
        console.error(
          "[Webhook] Tip: In production (temporary), set FORCE_SKIP_WEBHOOK_SIGNATURE=true to bypass (use with caution!)"
        );
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      } else {
        console.log("[Webhook] Signature verified successfully");
      }
    } else {
      const skipReason = isDevelopment
        ? "development mode"
        : "FORCE_SKIP_WEBHOOK_SIGNATURE is set";
      console.log(`[Webhook] Skipping signature verification (${skipReason})`);
    }

    // Log the full payload for debugging
    console.log("[Webhook] Received payload:", {
      event: body.event,
      type: body.type,
      success: body.success,
      id: body.id,
      hasData: !!body.data,
      dataType: Array.isArray(body.data) ? "array" : typeof body.data,
      dataLength: Array.isArray(body.data) ? body.data.length : "N/A",
      metadata: body.metadata,
      bodyKeys: Object.keys(body),
    });

    // Log full body structure for deeper debugging (truncated)
    const bodyPreview = JSON.stringify(body, null, 2);
    console.log(
      "[Webhook] Full body preview (first 500 chars):",
      bodyPreview.substring(0, 500)
    );

    // Extract webhook payload
    // Firecrawl uses 'type' field with values like "crawl.completed", "crawl.failed", etc.
    const eventType = body.event || body.type || body.status;
    // Normalize event type - Firecrawl uses "crawl.completed", we want just "completed"
    let event: string | undefined;
    if (eventType) {
      if (eventType.includes("completed") || eventType === "completed") {
        event = "completed";
      } else if (eventType.includes("failed") || eventType === "failed") {
        event = "failed";
      } else if (eventType.includes("started") || eventType === "started") {
        event = "started";
      } else {
        event = eventType;
      }
    }

    const metadata = body.metadata || {};
    const queueId = metadata.queueId as string;
    const schoolId = metadata.schoolId as string;
    const domain = metadata.domain as string;

    if (!queueId) {
      console.error("[Webhook] Missing queueId in metadata");
      console.error("[Webhook] Full body:", JSON.stringify(body, null, 2));
      return NextResponse.json(
        { error: "Missing queueId in metadata" },
        { status: 400 }
      );
    }

    console.log(
      `[Webhook] Processing event: ${event} (normalized from: ${eventType}) for queueId: ${queueId}`
    );

    // Handle page events - accumulate pages as they come in
    if (event === "page" || eventType?.includes("page")) {
      console.log(`[Webhook] Received page event - accumulating page data`);

      // Get the page data from the event
      // crawl.page events have data as an array of page objects
      let pagesToAdd: any[] = [];

      if (Array.isArray(body.data)) {
        // Extract individual page objects from the array
        pagesToAdd = body.data;
      } else if (body.data) {
        // If it's a single page object, wrap it in an array
        pagesToAdd = [body.data];
      }

      if (pagesToAdd.length === 0) {
        console.log(`[Webhook] Page event has no valid data field`);
        return NextResponse.json({ received: true });
      }

      // Find the queue job
      const job = await db
        .select()
        .from(crawlQueue)
        .where(eq(crawlQueue.id, queueId))
        .limit(1);

      if (job.length === 0) {
        console.error(
          `[Webhook] Queue job ${queueId} not found for page event`
        );
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Accumulate the pages (add each page object individually, not the array)
      const existingPages = (job[0].accumulatedPages as any[]) || [];
      const updatedPages = [...existingPages, ...pagesToAdd];

      await db
        .update(crawlQueue)
        .set({
          accumulatedPages: updatedPages,
          updatedAt: new Date(),
        })
        .where(eq(crawlQueue.id, queueId));

      console.log(
        `[Webhook] Accumulated page ${updatedPages.length} for job ${queueId}`
      );

      return NextResponse.json({ received: true });
    }

    // Only process completion events with actual data
    if (
      event === "completed" ||
      (!event && body.data && Array.isArray(body.data))
    ) {
      // If no event but we have data, assume it's a completion
      const actualEvent = event || "completed";
      let crawlData = body.data || body.pages || body.results; // Array of crawled pages

      if (!crawlData || !Array.isArray(crawlData)) {
        console.error("[Webhook] Invalid crawl data - expected array, got:", {
          type: typeof crawlData,
          isArray: Array.isArray(crawlData),
          value: crawlData
            ? JSON.stringify(crawlData).substring(0, 200)
            : "null/undefined",
        });
        return NextResponse.json(
          { error: "Invalid crawl data" },
          { status: 400 }
        );
      }

      // Check if data array is empty - if so, use accumulated pages from page events
      if (crawlData.length === 0) {
        console.log(
          `[Webhook] Received ${actualEvent} event but data array is empty (length: 0)`
        );
        console.log(`[Webhook] Body ID (Firecrawl job ID): ${body.id}`);

        // Find the queue job to check for accumulated pages
        const job = await db
          .select()
          .from(crawlQueue)
          .where(eq(crawlQueue.id, queueId))
          .limit(1);

        if (job.length > 0) {
          const accumulatedPages = (job[0].accumulatedPages as any[]) || [];

          if (accumulatedPages.length > 0) {
            console.log(
              `[Webhook] Using ${accumulatedPages.length} accumulated pages from page events`
            );
            crawlData = accumulatedPages;
          } else {
            // Check if there's data in other possible fields
            if (
              body.results &&
              Array.isArray(body.results) &&
              body.results.length > 0
            ) {
              console.log(
                `[Webhook] Found data in 'results' field, using that instead`
              );
              crawlData = body.results;
            } else if (
              body.pages &&
              Array.isArray(body.pages) &&
              body.pages.length > 0
            ) {
              console.log(
                `[Webhook] Found data in 'pages' field, using that instead`
              );
              crawlData = body.pages;
            } else {
              // No data found anywhere
              console.log(
                `[Webhook] No crawl data found in any field or accumulated pages. Marking as failed.`
              );
              await db
                .update(crawlQueue)
                .set({
                  status: "failed",
                  attempts: job[0].attempts + 1,
                  updatedAt: new Date(),
                })
                .where(eq(crawlQueue.id, queueId));
              console.log(
                `[Webhook] Marked job ${queueId} as failed - no crawl data received`
              );

              return NextResponse.json({
                received: true,
                message: "Completion event received but no crawl data found",
              });
            }
          }
        }
      }

      console.log(
        `[Webhook] Processing ${crawlData.length} crawled pages for ${actualEvent} event`
      );

      // Log first page structure for debugging
      if (crawlData.length > 0 && crawlData[0]) {
        const firstPage = crawlData[0];
        console.log(`[Webhook] First page structure:`, {
          keys:
            typeof firstPage === "object" && firstPage
              ? Object.keys(firstPage)
              : "not an object",
          hasMarkdown: !!(firstPage as any)?.markdown,
          hasContent: !!(firstPage as any)?.content,
          markdownPreview: (firstPage as any)?.markdown?.substring(0, 100),
        });
      }

      // Find the queue job
      const job = await db
        .select()
        .from(crawlQueue)
        .where(eq(crawlQueue.id, queueId))
        .limit(1);

      if (job.length === 0) {
        console.error(`[Webhook] Queue job ${queueId} not found`);
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const queueJob = job[0];

      // Update status to processing
      await db
        .update(crawlQueue)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(crawlQueue.id, queueId));

      // Process the crawl result (extract structured data)
      const extractResult = await processCrawlResult(crawlData);

      if (extractResult.success && extractResult.data) {
        // Create snapshot (even for 404 pages to track site availability)
        const snapshotId = crypto.randomUUID();
        const extractedData = extractResult.data.extracted as Record<
          string,
          unknown
        >;

        // Log if this is a 404 page
        if (extractedData.siteStatus === "404") {
          console.log(
            `[Webhook] Creating snapshot for 404 page - site appears to be down/unavailable for job ${queueId}`
          );
        }

        await db.insert(snapshots).values({
          id: snapshotId,
          schoolId: queueJob.schoolId,
          domain: queueJob.domain,
          asOf: new Date(),
          rawJson: extractedData,
          extractConfidence: extractResult.data.confidence ?? null,
        });

        // Mark as completed (even for 404 pages - we successfully crawled and documented the issue)
        await db
          .update(crawlQueue)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(crawlQueue.id, queueId));

        console.log(
          `[Webhook] Successfully processed crawl for job ${queueId}${
            extractedData.siteStatus === "404" ? " (404 page detected)" : ""
          }`
        );
      } else {
        // Extraction failed - mark as failed immediately (no retry)
        await db
          .update(crawlQueue)
          .set({
            status: "failed",
            attempts: queueJob.attempts + 1,
            updatedAt: new Date(),
          })
          .where(eq(crawlQueue.id, queueId));

        console.error(
          `[Webhook] Extraction failed for job ${queueId}: ${extractResult.error}`
        );
      }
    } else if (event === "failed") {
      // Handle failed crawl event
      const queueId = metadata.queueId as string;
      if (queueId) {
        const job = await db
          .select()
          .from(crawlQueue)
          .where(eq(crawlQueue.id, queueId))
          .limit(1);

        if (job.length > 0) {
          const queueJob = job[0];
          // Mark as failed immediately (no retry)
          await db
            .update(crawlQueue)
            .set({
              status: "failed",
              attempts: queueJob.attempts + 1,
              updatedAt: new Date(),
            })
            .where(eq(crawlQueue.id, queueId));

          console.error(`[Webhook] Crawl failed for job ${queueId}`);
        }
      }
    } else {
      // Log other events (started, page) but don't process
      if (event) {
        console.log(
          `[Webhook] Received ${event} event for queueId: ${metadata.queueId} (not processing)`
        );
      } else {
        // No event field - check if we have data to process anyway
        console.log(
          `[Webhook] Received webhook with no event field for queueId: ${queueId}`
        );
        console.log(
          `[Webhook] Payload structure:`,
          JSON.stringify(
            {
              keys: Object.keys(body),
              hasData: !!body.data,
              dataIsArray: Array.isArray(body.data),
              dataLength: Array.isArray(body.data) ? body.data.length : "N/A",
            },
            null,
            2
          )
        );

        // If we have data but no event, try to process it as a completion
        if (body.data && Array.isArray(body.data) && body.data.length > 0) {
          console.log(
            `[Webhook] Found data array without event field, processing as completion`
          );
          const crawlData = body.data;

          const job = await db
            .select()
            .from(crawlQueue)
            .where(eq(crawlQueue.id, queueId))
            .limit(1);

          if (job.length > 0) {
            const queueJob = job[0];

            await db
              .update(crawlQueue)
              .set({
                status: "processing",
                updatedAt: new Date(),
              })
              .where(eq(crawlQueue.id, queueId));

            const extractResult = await processCrawlResult(crawlData);

            if (extractResult.success && extractResult.data) {
              const snapshotId = crypto.randomUUID();
              const extractedData = extractResult.data.extracted as Record<
                string,
                unknown
              >;

              // Log if this is a 404 page
              if (extractedData.siteStatus === "404") {
                console.log(
                  `[Webhook] Creating snapshot for 404 page (no event field) - site appears to be down/unavailable for job ${queueId}`
                );
              }

              await db.insert(snapshots).values({
                id: snapshotId,
                schoolId: queueJob.schoolId,
                domain: queueJob.domain,
                asOf: new Date(),
                rawJson: extractedData,
                extractConfidence: extractResult.data.confidence ?? null,
              });

              await db
                .update(crawlQueue)
                .set({
                  status: "completed",
                  updatedAt: new Date(),
                })
                .where(eq(crawlQueue.id, queueId));

              console.log(
                `[Webhook] Successfully processed crawl (no event field) for job ${queueId}${
                  extractedData.siteStatus === "404"
                    ? " (404 page detected)"
                    : ""
                }`
              );
            } else {
              console.error(
                `[Webhook] Extraction failed for job ${queueId}: ${extractResult.error}`
              );
              // Handle retry logic here if needed
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
