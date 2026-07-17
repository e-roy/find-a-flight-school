/**
 * Server-side Cloudflare Turnstile verification. Used to gate the public,
 * unauthenticated endpoints that trigger paid Google Places calls.
 */
import { TRPCError } from "@trpc/server";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileOrThrow(
  token: string | undefined | null,
  ip?: string
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Human verification is not configured.",
    });
  }
  if (!token) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please complete the verification challenge.",
    });
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip && ip !== "unknown") {
    form.set("remoteip", ip);
  }

  let data: { success?: boolean } | null = null;
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    data = (await res.json()) as { success?: boolean };
  } catch (error) {
    console.error("Turnstile verification request failed:", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Could not verify the challenge. Please try again.",
    });
  }

  if (!data?.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Verification failed. Please retry the challenge.",
    });
  }
}
