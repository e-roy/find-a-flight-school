import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { claims } from "@/db/schema/claims";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { processJob } from "@/lib/crawl-worker";
import { assertNoLiveCrawl } from "@/server/routers/crawl-queue";

/**
 * Free / personal email providers can never claim a school — claiming is gated
 * purely on the work-email domain matching the school's website domain.
 */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
]);

function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  return parts[1].trim().toLowerCase() || null;
}

function isFreeDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.has(domain);
}

/**
 * Verify the signed-in user may claim the given school: their (non-free) email
 * domain must equal the school's website domain. The Google sign-in already
 * proves the email, so the match itself is the verification.
 */
async function assertClaimable(
  ctx: { db: typeof import("@/lib/db").db; session: { user?: { email?: string | null } } | null },
  schoolId: string
) {
  const domain = emailDomain(ctx.session?.user?.email);
  if (!domain || isFreeDomain(domain)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only a work email matching the school's website can claim it.",
    });
  }
  const school = await ctx.db.query.schools.findFirst({
    where: (s, { eq }) => eq(s.id, schoolId),
  });
  if (!school) {
    throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
  }
  if (!school.domain || school.domain.toLowerCase() !== domain) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your email domain doesn't match this school.",
    });
  }
  return { school, domain };
}

export const claimRouter = router({
  /**
   * Resolve the signed-in user's claim situation from their email domain:
   * free provider, a matched school, or a real domain with no listing yet.
   */
  match: protectedProcedure.query(async ({ ctx }) => {
    const email = ctx.session?.user?.email ?? null;
    const domain = emailDomain(email);
    if (!domain) {
      return { status: "free" as const, email, domain: null };
    }
    if (isFreeDomain(domain)) {
      return { status: "free" as const, email, domain };
    }
    const school = await ctx.db.query.schools.findFirst({
      where: (s, { eq }) => eq(s.domain, domain),
    });
    if (school) {
      return {
        status: "matched" as const,
        email,
        domain,
        schoolId: school.id,
      };
    }
    return { status: "no-match" as const, email, domain };
  }),

  /**
   * Owner-guarded site crawl. Re-checks the domain match, then runs the real
   * crawl + extraction (same engine as the admin "Crawl now").
   */
  crawl: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { school } = await assertClaimable(ctx, input.schoolId);
      const url = school.domain!.startsWith("http")
        ? school.domain!
        : `https://${school.domain!}`;

      await assertNoLiveCrawl(ctx.db, school.id);

      await ctx.db.delete(crawlQueue).where(eq(crawlQueue.schoolId, school.id));
      const id = crypto.randomUUID();
      await ctx.db.insert(crawlQueue).values({
        id,
        schoolId: school.id,
        domain: url,
        status: "pending",
        attempts: 0,
        scheduledAt: new Date(),
      });
      const job = await ctx.db.query.crawlQueue.findFirst({
        where: (q, { eq }) => eq(q.id, id),
      });
      if (!job) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create crawl job",
        });
      }
      return processJob(job);
    }),

  /**
   * Publish the owner's reviewed edits as approved owner facts and record the
   * verified claim (so the school shows the Community-Verified tier).
   */
  publish: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        facts: z
          .array(
            z.object({
              factKey: z.string().min(1),
              factValue: z.unknown(),
            })
          )
          .max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { school } = await assertClaimable(ctx, input.schoolId);
      const base = Date.now();

      if (input.facts.length > 0) {
        // Offset asOf per row so duplicate (schoolId, factKey) edits (e.g. a
        // program list) don't collide on the (schoolId, factKey, asOf) PK.
        const rows = input.facts.map((f, i) => ({
          schoolId: school.id,
          factKey: f.factKey,
          factValue: f.factValue as never,
          provenance: "CLAIM" as const,
          // Owner-verified by domain match → live immediately.
          moderationStatus: "APPROVED" as const,
          asOf: new Date(base + i),
        }));
        await ctx.db.insert(facts).values(rows);
      }

      // Record the verified claim (drives the Community-Verified tier).
      const existing = await ctx.db
        .select({ id: claims.id })
        .from(claims)
        .where(eq(claims.schoolId, school.id))
        .limit(1);
      if (existing.length === 0) {
        await ctx.db.insert(claims).values({
          id: crypto.randomUUID(),
          schoolId: school.id,
          email: ctx.session!.user!.email!,
          token: crypto.randomUUID(),
          status: "VERIFIED",
        });
      } else {
        await ctx.db
          .update(claims)
          .set({ status: "VERIFIED", updatedAt: new Date() })
          .where(eq(claims.id, existing[0].id));
      }

      return { ok: true, schoolId: school.id };
    }),
});
